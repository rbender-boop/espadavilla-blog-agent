/**
 * github.ts — minimal GitHub write client for the publish executor.
 *
 * Commits multiple files in ONE atomic commit to espadavilla-com main via the git
 * data API (blobs → tree → commit → fast-forward ref update). Never force-pushes,
 * never touches any other repo. Auth is a fine-grained PAT (GITHUB_TOKEN_ESPADAVILLA)
 * scoped to rbender-boop/espadavilla-com only — a bug here cannot reach any other repo.
 */

import { Octokit } from '@octokit/rest';

const DEFAULT_BRANCH = 'main';

let _octokit: Octokit | null = null;
function getOctokit(): Octokit {
  if (_octokit) return _octokit;
  const auth = process.env.GITHUB_TOKEN_ESPADAVILLA;
  if (!auth) throw new Error('GITHUB_TOKEN_ESPADAVILLA required');
  _octokit = new Octokit({ auth });
  return _octokit;
}

function repoParts(): { owner: string; repo: string } {
  const full = process.env.ESPADAVILLA_REPO ?? 'rbender-boop/espadavilla-com';
  const [owner, repo] = full.split('/');
  if (!owner || !repo) throw new Error(`ESPADAVILLA_REPO must be "owner/repo", got "${full}"`);
  return { owner, repo };
}

export type RepoFile = { path: string; content: string };

/** Read a file's text content + blob sha. Returns null on 404. */
export async function getFile(path: string, branch = DEFAULT_BRANCH): Promise<{ content: string; sha: string } | null> {
  const { owner, repo } = repoParts();
  try {
    const res = await getOctokit().rest.repos.getContent({ owner, repo, path, ref: branch });
    const data = res.data as { content?: string; encoding?: string; sha: string };
    if (typeof data.content !== 'string') return null;
    const content = Buffer.from(data.content, (data.encoding as BufferEncoding) ?? 'base64').toString('utf-8');
    return { content, sha: data.sha };
  } catch (err: unknown) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

/**
 * Commit multiple files in a single atomic commit to `branch`. Fast-forward
 * only (parents = current head). Returns the new commit sha + html url.
 */
export async function commitFiles(files: RepoFile[], message: string, branch = DEFAULT_BRANCH): Promise<{ commitSha: string; commitUrl: string }> {
  if (files.length === 0) throw new Error('commitFiles: no files to commit');
  const { owner, repo } = repoParts();
  const gh = getOctokit();

  // 1. Current head + base tree.
  const ref = await gh.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const headSha = ref.data.object.sha;
  const headCommit = await gh.rest.git.getCommit({ owner, repo, commit_sha: headSha });
  const baseTreeSha = headCommit.data.tree.sha;

  // 2. New tree with inline file contents (blobs created implicitly).
  const tree = await gh.rest.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', content: f.content })),
  });

  // 3. Commit on top of head.
  const commit = await gh.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.data.sha,
    parents: [headSha],
  });

  // 4. Fast-forward the branch ref. force:false — never rewrite history.
  await gh.rest.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: commit.data.sha, force: false });

  return { commitSha: commit.data.sha, commitUrl: commit.data.html_url };
}

function isNotFound(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { status?: number }).status === 404;
}
