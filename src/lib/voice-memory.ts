/**
 * Blog voice memory — edit-derived learnings injected into the drafter prompt.
 *
 * Read side (getBlogMemoryPromptBlock) is used by the drafter every run.
 * Write side (insertVoiceMemory) is fed by the Phase 6 edit-learning loop.
 *
 * Fail-OPEN: if blog_voice_memories doesn't exist yet (pre-migration) or the
 * query fails, returns an empty block so drafting keeps working.
 */

import { supabase } from './supabase';

const MAX_MEMORIES = 30;

export type VoiceMemory = {
  id: string;
  scope: string;
  memory_text: string;
  weight: number;
  is_active: boolean;
  approved: boolean;
  source_type: string | null;
  created_at: string;
};

export async function retrieveVoiceMemories(scope = 'post'): Promise<VoiceMemory[]> {
  try {
    const { data, error } = await supabase
      .from('blog_voice_memories')
      .select('*')
      .eq('is_active', true)
      .eq('approved', true)
      .eq('scope', scope)
      .order('weight', { ascending: false })
      .limit(MAX_MEMORIES);
    if (error) {
      console.warn('[voice-memory] retrieve failed (fail-open):', error.message);
      return [];
    }
    return (data ?? []) as VoiceMemory[];
  } catch (e) {
    console.warn('[voice-memory] retrieve threw (fail-open):', e instanceof Error ? e.message : String(e));
    return [];
  }
}

export function formatMemoriesForPrompt(memories: VoiceMemory[]): string {
  if (memories.length === 0) return '';
  const bullets = memories.map((m) => `- ${m.memory_text}`).join('\n');
  return ['# LEARNED VOICE MEMORIES (apply strictly — derived from Rob\'s past edits)', bullets].join('\n');
}

export async function getBlogMemoryPromptBlock(scope = 'post'): Promise<string> {
  return formatMemoriesForPrompt(await retrieveVoiceMemories(scope));
}

export async function insertVoiceMemory(m: {
  memory_text: string;
  scope?: string;
  weight?: number;
  source_type?: string;
}): Promise<void> {
  const { error } = await supabase.from('blog_voice_memories').insert({
    memory_text: m.memory_text,
    scope: m.scope ?? 'post',
    weight: m.weight ?? 1.0,
    source_type: m.source_type ?? 'edit_learning',
  });
  if (error) console.warn('[voice-memory] insert failed (fail-open):', error.message);
}
