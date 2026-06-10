/**
 * commit-post.ts — the publish executor (the core novel component).
 *
 * Fires when a draft hits status='approved' (from the inbound resolver on a
 * WhatsApp "yes", or the drain-approved cron). Renders the final HTML, updates
 * the blog index + sitemap, and commits all three files to golfvilla-com main
 * in ONE atomic commit. Vercel auto-deploys off the push.
 *
 * Safety: idempotent (a 'published' draft is never re-committed); one publish
 * per call; never force-pushes; only touches golfvilla-com.
 */

import { supabase } from '../supabase';
import { sendWhatsAppToOwner } from '../unipile';
import { postUrl, postRepoPath, SITE_ORIGIN } from '../links';
import { renderPostHtml } from './render-post';
import { pickPostImage } from './blog-images';
import { addUrlToSitemap } from './update-sitemap';
import { upsertIndexCard } from './update-index';
import { upsertLlmsEntry } from './update-llms';
import { indexNowKey, indexNowKeyPath, pingIndexNow } from './indexnow';
import { getFile, commitFiles, type RepoFile } from './github';

const SITEMAP_PATH = 'sitemap.xml';
const INDEX_PATH = 'blog/index.html';
const LLMS_PATH = 'llms.txt';

type DraftRow = {
  id: string;
  topic_id: string | null;
  status: string;
  slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  h1: string | null;
  summary: string | null;
  body_markdown: string | null;
  edited_content: string | null;
  faq: Array<{ q: string; a: string }> | null;
  sources: Array<{ claim: string; url: string }> | null;
  risk_score: number | null;
  live_url: string | null;
  word_count: number | null;
  published_at: string | null;
  updated_at: string | null;
};

export type PublishResult =
  | { ok: true; draft_id: string; live_url: string; commit_url: string; already_published?: boolean }
  | { ok: false; draft_id: string; error: string };

export async function publishApprovedDraft(draftId: string): Promise<PublishResult> {
  const { data: draft, error } = await supabase
    .from('blog_post_drafts')
    .select('id, topic_id, status, slug, meta_title, meta_description, h1, summary, body_markdown, edited_content, faq, sources, risk_score, live_url, word_count, published_at, updated_at')
    .eq('id', draftId)
    .single<DraftRow>();

  if (error || !draft) return { ok: false, draft_id: draftId, error: `draft not found: ${error?.message ?? 'no row'}` };

  // Idempotency guard — never double-commit.
  if (draft.status === 'published') {
    return { ok: true, draft_id: draftId, live_url: draft.live_url ?? '', commit_url: '', already_published: true };
  }
  if (draft.status !== 'approved') {
    return { ok: false, draft_id: draftId, error: `draft is not approved (status=${draft.status})` };
  }
  if (!draft.slug || !draft.meta_title || !draft.meta_description || !draft.h1) {
    return { ok: false, draft_id: draftId, error: 'draft missing required fields (slug/meta_title/meta_description/h1)' };
  }

  const slug = draft.slug;
  const url = postUrl(slug);
  const repoPath = postRepoPath(slug);
  // Phase 4: detect a content refresh up front. A refreshed post must KEEP the
  // original datePublished (changing it on every refresh looks like date
  // manipulation to search engines) and carry today as dateModified.
  let refreshesDraftId: string | null = null;
  let originalPublishedAt: string | null = null;
  if (draft.topic_id) {
    const { data: topicRow } = await supabase
      .from('blog_topics')
      .select('refreshes_draft_id')
      .eq('id', draft.topic_id)
      .maybeSingle<{ refreshes_draft_id: string | null }>();
    refreshesDraftId = topicRow?.refreshes_draft_id ?? null;
    if (refreshesDraftId) {
      const { data: orig } = await supabase
        .from('blog_post_drafts')
        .select('published_at')
        .eq('id', refreshesDraftId)
        .maybeSingle<{ published_at: string | null }>();
      originalPublishedAt = orig?.published_at ?? null;
    }
  }

  // #2 — derive the published date ONCE and reuse it: if the post was already
  // published, keep its original published_at so a re-render never shifts the
  // date and the post/index/sitemap can never disagree. For a refresh, inherit
  // the ORIGINAL post's publish date. UTC throughout.
  const publishedSource = draft.published_at ?? originalPublishedAt;
  const publishedISO = (publishedSource ? new Date(publishedSource) : new Date()).toISOString().slice(0, 10);
  const modifiedISO = new Date().toISOString().slice(0, 10);

  // #9 — pull the topic's cluster (articleSection) + keywords for schema enrichment.
  let articleSection: string | undefined;
  let keywords: string[] | undefined;
  if (draft.topic_id) {
    const { data: topic } = await supabase
      .from('blog_topics')
      .select('cluster, primary_keyword, secondary_keywords')
      .eq('id', draft.topic_id)
      .maybeSingle<{ cluster: string | null; primary_keyword: string | null; secondary_keywords: string[] | null }>();
    if (topic) {
      articleSection = topic.cluster ?? undefined;
      keywords = [topic.primary_keyword ?? '', ...(topic.secondary_keywords ?? [])].filter(Boolean);
      if (!keywords.length) keywords = undefined;
    }
  }

  // Rob's pasted edit (if any) replaces the body; structured SEO fields persist.
  const bodyMarkdown = (draft.edited_content?.trim() ? draft.edited_content : draft.body_markdown) ?? '';

  try {
    // Phase 4: if this is a content-refresh, supersede the original published
    // draft BEFORE committing so the committed_path unique constraint doesn't
    // block the new draft from claiming the same repo path.
    if (refreshesDraftId) {
      const now2 = new Date().toISOString();
      await supabase
        .from('blog_post_drafts')
        .update({ status: 'superseded', committed_path: null, updated_at: now2 })
        .eq('id', refreshesDraftId)
        .eq('status', 'published'); // only supersede if the original is still published
    }

    // 1. Render the post HTML. Cluster-mapped hero image (stable per slug).
    const heroImage = pickPostImage(slug, articleSection ?? null);
    const postHtml = renderPostHtml({
      slug,
      meta_title: draft.meta_title,
      meta_description: draft.meta_description,
      h1: draft.h1,
      summary: draft.summary ?? undefined,
      body_markdown: bodyMarkdown,
      faq: draft.faq ?? [],
      sources: draft.sources ?? undefined,
      publishedISO,
      modifiedISO,
      wordCount: draft.word_count ?? undefined,
      articleSection,
      keywords,
      image: heroImage,
    });

    // 2. Read current index + sitemap + llms.txt (+ IndexNow key file) from the
    //    repo (resolve live, don't guess).
    const inKey = indexNowKey();
    const [indexFile, sitemapFile, llmsFile, keyFile] = await Promise.all([
      getFile(INDEX_PATH),
      getFile(SITEMAP_PATH),
      getFile(LLMS_PATH),
      inKey ? getFile(indexNowKeyPath(inKey)) : Promise.resolve(null),
    ]);

    const files: RepoFile[] = [{ path: repoPath, content: postHtml }];

    // IndexNow key file: serve <key>.txt at the site root (required by the
    // protocol before pings are accepted). Committed once, then idempotent.
    if (inKey && !keyFile) files.push({ path: indexNowKeyPath(inKey), content: inKey });

    // 3. Blog index (create if missing; idempotent insert).
    const indexResult = upsertIndexCard(indexFile?.content ?? null, {
      slug,
      title: draft.meta_title,
      description: draft.meta_description,
      publishedISO,
    });
    if (indexResult.changed || !indexFile) files.push({ path: INDEX_PATH, content: indexResult.html });

    // 4. Sitemap (surgical insert; skip gracefully if the file is unexpectedly absent).
    if (sitemapFile) {
      let xml = sitemapFile.content;
      let smChanged = false;
      // The post itself — lastmod is the modification date (updates on refresh).
      const smPost = addUrlToSitemap(xml, { loc: url, lastmod: modifiedISO, changefreq: 'monthly', priority: '0.6' });
      xml = smPost.xml; smChanged = smChanged || smPost.changed;
      // #7 — ensure the /blog index page is in the sitemap too (lastmod tracks every publish).
      const smIndex = addUrlToSitemap(xml, { loc: `${SITE_ORIGIN}/blog`, lastmod: modifiedISO, changefreq: 'weekly', priority: '0.7' });
      xml = smIndex.xml; smChanged = smChanged || smIndex.changed;
      if (smChanged) files.push({ path: SITEMAP_PATH, content: xml });
    } else {
      console.warn('[commit-post] sitemap.xml not found in repo — publishing post + index without sitemap update');
    }

    // 4b. llms.txt — AI-crawler discovery file. Upsert this post's entry (a
    // refresh to the same URL updates the existing line). Hand-curated sections
    // are never touched; skip gracefully if the file is unexpectedly absent.
    if (llmsFile) {
      const llmsResult = upsertLlmsEntry(llmsFile.content, {
        url,
        title: draft.meta_title,
        description: draft.meta_description,
        dateISO: modifiedISO,
      });
      if (llmsResult.changed) files.push({ path: LLMS_PATH, content: llmsResult.txt });
    } else {
      console.warn('[commit-post] llms.txt not found in repo — publishing without llms.txt update');
    }

    // 5. One atomic commit to main.
    const message = `blog: publish "${draft.meta_title}" (${slug})`;
    const { commitUrl } = await commitFiles(files, message);

    // 5b. IndexNow ping (best-effort — feeds Bing/Copilot/ChatGPT-search;
    // Google freshness is covered by the sitemap lastmod). Never blocks/fails
    // the publish. Skipped automatically if INDEXNOW_KEY is unset.
    const indexNow = await pingIndexNow([url, `${SITE_ORIGIN}/blog`]);

    // 6. Record success. A refresh keeps the ORIGINAL publish timestamp so the
    // page's datePublished stays stable across the whole refresh chain.
    const now = new Date().toISOString();
    const publishedAt = draft.published_at ?? originalPublishedAt ?? now;
    await supabase
      .from('blog_post_drafts')
      .update({ status: 'published', committed_path: repoPath, live_url: url, published_at: publishedAt, updated_at: now })
      .eq('id', draftId);
    if (draft.topic_id) {
      await supabase.from('blog_topics').update({ status: 'published', updated_at: now }).eq('id', draft.topic_id);
    }
    await supabase.from('blog_agent_runs').insert({
      run_type: 'publish',
      status: 'success',
      items_processed: 1,
      metadata: { draft_id: draftId, slug, live_url: url, commit_url: commitUrl, files: files.map((f) => f.path), indexnow: indexNow },
      completed_at: now,
    });

    // 7. Notify Rob (Vercel build may take ~1 min).
    await safelyNotify([`✅ Published: ${url}`, `(Vercel is building — live in ~1 min.)`].join('\n'));

    return { ok: true, draft_id: draftId, live_url: url, commit_url: commitUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const now = new Date().toISOString();
    // Leave status 'approved' so a later drain-approved run can retry.
    await supabase.from('blog_agent_runs').insert({
      run_type: 'publish',
      status: 'failure',
      error_message: msg,
      metadata: { draft_id: draftId, slug },
      completed_at: now,
    });
    await safelyNotify(`❌ Publish FAILED for "${draft.meta_title}" (${slug}).\nError: ${msg}\nDraft stays approved; will retry next sweep.`);
    return { ok: false, draft_id: draftId, error: msg };
  }
}

/** Publish all drafts currently in 'approved' (drain path). One commit each. */
export async function publishAllApproved(): Promise<PublishResult[]> {
  const { data: approved } = await supabase
    .from('blog_post_drafts')
    .select('id')
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(5);
  const results: PublishResult[] = [];
  for (const row of approved ?? []) {
    const r = await publishApprovedDraft(row.id);
    results.push(r);
    if (!r.ok) break; // stop on first failure; retried next sweep
  }
  return results;
}

async function safelyNotify(message: string): Promise<void> {
  try {
    await sendWhatsAppToOwner(message);
  } catch (err) {
    console.error('Failed to send WhatsApp notification:', err);
  }
}
