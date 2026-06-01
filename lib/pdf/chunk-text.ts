export type ChunkedText = {
  content: string;
  tokenCount: number;
};

export type ChunkTextOptions = {
  maxTokens?: number;
  overlapTokens?: number;
};

const DEFAULT_MAX_TOKENS = 1000;
const DEFAULT_OVERLAP_TOKENS = 150;

export function chunkText(
  input: string,
  options: ChunkTextOptions = {}
): ChunkedText[] {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  if (maxTokens <= 0) return [];

  const overlapTokens = options.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;
  const clampedOverlap = Math.min(
    Math.max(overlapTokens, 0),
    Math.max(maxTokens - 1, 0)
  );

  const paragraphs = input
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: ChunkedText[] = [];
  let current: string[] = [];

  const finalizeChunk = (keepOverlap: boolean) => {
    if (current.length === 0) return;
    const content = current.join(' ').trim();
    if (content) {
      chunks.push({ content, tokenCount: current.length });
    }
    if (keepOverlap && clampedOverlap > 0) {
      current = current.slice(Math.max(0, current.length - clampedOverlap));
    } else {
      current = [];
    }
  };

  for (const paragraph of paragraphs) {
    let words = paragraph.split(/\s+/).filter(Boolean);
    while (words.length > 0) {
      const remaining = maxTokens - current.length;
      if (remaining <= 0) {
        finalizeChunk(true);
        continue;
      }

      if (words.length <= remaining) {
        current.push(...words);
        words = [];
      } else {
        current.push(...words.slice(0, remaining));
        words = words.slice(remaining);
        finalizeChunk(true);
      }
    }
  }

  finalizeChunk(false);
  return chunks;
}
