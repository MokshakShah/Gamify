import Groq from 'groq-sdk';

import { enrichSummaryMarkdown } from '@/lib/summary/enrich-summary-markdown';
import { cleanYoutubeTitle } from '@/lib/youtube/clean-title';

const MODEL = 'llama-3.3-70b-versatile';

function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured.');
  }
  return new Groq({ apiKey });
}

const SYSTEM_PROMPT = `You are an expert educational summarizer for Gamify (students revising from YouTube lectures).

Output ONLY valid markdown (no code fences, no preamble).

STRUCTURE (required):
1. First line: a single H1 with a short, clear topic name (5–12 words). Plain text only in the H1 — NO asterisks, NO bold markers. Example: "# CURE Algorithm — Hierarchical Clustering"
2. One short overview paragraph (2–3 sentences).
3. Sections using ## headers only (e.g. ## Core idea, ## How it works, ## Key properties, ## Complexity & numbers, ## Exam takeaways).
4. Use bullet lists under each section where helpful.

FORMATTING (required — every item is mandatory):
- Use ## section headers; include a section "## Key highlights" with bullet points (not long paragraphs).
- On EVERY bullet, **bold the leading idea** before the colon. Example: "- **Detects arbitrary cluster shapes**: including non-spherical clusters."
- **Bold** algorithm names and core terms (e.g. **CURE algorithm**, **representative points**, **outliers**).
- Wrap EVERY number, complexity, percentage, and count in ==double equals==. Examples: ==O(n² log n)==, ==O(n²)==, ==O(n)==, ==2%==.
- Never write bare "O(n^2)" without == markers. Never list key ideas as plain paragraphs only — use bullets under ## Key highlights.
- Do NOT repeat the channel name or raw URL in the body.
- Do not invent facts absent from the transcript.

EXAMPLE fragment:
## Key highlights
- **Hierarchical clustering**: uses ==k== representative points per cluster.
- **Time complexity**: ==O(n² log n)== for large datasets; ==O(n²)== for low dimensionality.
- **Space complexity**: ==O(n)==.`;

export async function summarizeYoutubeTranscript(input: {
  title: string;
  channelName: string;
  sourceUrl: string;
  transcript: string;
}): Promise<string> {
  const groq = getGroq();
  const cleanTitle = cleanYoutubeTitle(input.title);

  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.25,
    max_tokens: 2800,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Video title (raw): ${input.title}
Suggested short topic (use or improve): ${cleanTitle}
Channel: ${input.channelName}

Transcript:
${input.transcript}

Write the structured markdown summary.`,
      },
    ],
  });

  const summary = completion.choices[0]?.message?.content?.trim();
  if (!summary) {
    throw new Error('Groq returned an empty summary.');
  }
  return enrichSummaryMarkdown(summary);
}
