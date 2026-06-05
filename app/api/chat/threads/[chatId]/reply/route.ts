import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

import {
  ChatAttachmentChunkRow,
  addChatMessage,
  getChatThreadByChatId,
  listChatAttachmentChunks,
  listChatMessagesForThread,
  updateChatThreadTitleByChatId,
} from '@/lib/supabase/chat';

export const dynamic = 'force-dynamic';

const MODEL = 'llama-3.3-70b-versatile';

type RouteContext = { params: { chatId: string } };

type DeepDiveContext = {
  summaryId: string;
  topic: string;
  title: string;
  channelName: string;
  sourceUrl: string;
  summary: string;
};

function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured.');
  }
  return new Groq({ apiKey });
}

function buildSystemPrompt(
  context?: DeepDiveContext | null,
  pdfChunks?: ChatAttachmentChunkRow[]
): string {
  const lines = [
    'You are a helpful study tutor for Gamify.',
    'Explain concepts clearly, step-by-step, and use short paragraphs.',
    'If the user asks for depth, include examples and intuition.',
    '',
    'IMPORTANT - MCQ REQUESTS:',
    'If the user asks for MCQs, multiple choice questions, quiz questions, or any form of questions:',
    '- NEVER generate actual questions in this chat',
    '- NEVER write out question text, options A/B/C/D, or answers',
    '- Simply say "MCQs can be generated in the MCQ section" and redirect them',
    '- Do NOT create any quiz content in this conversation',
    '',
    'Examples of what NOT to do:',
    '- Do not write "1. What is..." followed by options',
    '- Do not write "A) option B) option C) option D) option"',
    '- Do not write "Answer: C"',
    '',
    'Instead, just acknowledge and redirect to MCQ section.',
  ];

  if (context) {
    lines.push(
      '',
      'CONTEXT FROM YOUTUBE TRANSCRIPT:',
      `Topic: ${context.topic}`,
      `Title: ${context.title}`,
      `Channel: ${context.channelName}`,
      `Summary: ${context.summary}`
    );
  }

  if (pdfChunks && pdfChunks.length > 0) {
    lines.push('', 'CONTEXT FROM UPLOADED PDF:');
    // Limit to ~20 chunks to stay safe, though Llama 3.3 handles more.
    pdfChunks.slice(0, 20).forEach((chunk, i) => {
      lines.push(`[Chunk ${i + 1}]: ${chunk.content}`);
    });
  }

  lines.push(
    '',
    'If the user asks about the document or video, use the provided context.',
    'If the question is unrelated to the context, answer using your general knowledge but keep it professional.'
  );

  return lines.join('\n');
}

function streamEvent(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function detectMcqRequest(content: string): { isMcqRequest: boolean; topic?: string; count?: number } {
  const lowerContent = content.toLowerCase();
  
  // MCQ keywords
  const mcqKeywords = [
    'mcq', 'mcqs', 'multiple choice', 'quiz questions', 'questions',
    'generate questions', 'create questions', 'make questions', 'quiz'
  ];
  
  const isMcqRequest = mcqKeywords.some(keyword => lowerContent.includes(keyword));
  
  if (!isMcqRequest) {
    return { isMcqRequest: false };
  }
  
  // Extract count (default to 10, max 15)
  let count = 10;
  const countMatch = content.match(/(\d+)\s*(?:mcq|questions?|quiz)/i);
  if (countMatch) {
    const requestedCount = parseInt(countMatch[1]);
    if (requestedCount > 0) {
      count = Math.min(requestedCount, 15);
    }
  }
  
  // Extract topic - look for common patterns
  let topic = '';
  
  // Pattern: "MCQs on [topic]" or "questions about [topic]"
  const onPattern = content.match(/(?:mcqs?|questions?|quiz).*?(?:on|about|for)\s+(.+?)(?:\s|$|\.|\?|!)/i);
  if (onPattern) {
    topic = onPattern[1].trim();
  }
  
  // Pattern: "[topic] MCQs" or "[topic] questions"
  if (!topic) {
    const beforePattern = content.match(/(.+?)\s+(?:mcqs?|questions?|quiz)/i);
    if (beforePattern) {
      const candidate = beforePattern[1].trim();
      // Skip common words
      if (!['generate', 'create', 'make', 'give', 'me', 'some', 'few'].includes(candidate.toLowerCase())) {
        topic = candidate;
      }
    }
  }
  
  // If no specific topic found, check for "this PDF" or "this document"
  if (!topic && (lowerContent.includes('this pdf') || lowerContent.includes('this document'))) {
    topic = 'document content';
  }
  
  return { isMcqRequest: true, topic: topic || 'general knowledge', count };
}

function generateSetTitle(topic: string, sourceType: string): string {
  const cleanTopic = topic.trim();
  
  switch (sourceType) {
    case 'pdf':
      return `${cleanTopic} MCQs (PDF)`;
    case 'youtube':
      return `${cleanTopic} MCQs (Video)`;
    default:
      return `${cleanTopic} MCQs`;
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    content?: string;
    title?: string;
    context?: DeepDiveContext | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: 'content is required.' }, { status: 400 });
  }

  const { chatId } = params;

  try {
    const thread = await getChatThreadByChatId(userId, chatId);
    if (!thread) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
    }

    let title = thread.title;
    if (body.title?.trim()) {
      const updated = await updateChatThreadTitleByChatId(
        userId,
        chatId,
        body.title.trim()
      );
      title = updated?.title ?? body.title.trim();
    }

    // Check if this is an MCQ request
    const mcqRequest = detectMcqRequest(content);

    const userMessage = await addChatMessage(thread.id, 'user', content);

    const [history, pdfChunks] = await Promise.all([
      listChatMessagesForThread(thread.id),
      listChatAttachmentChunks(thread.id),
    ]);

    const recent = history.slice(-12).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const systemPrompt = buildSystemPrompt(body.context, pdfChunks);
    const groq = getGroq();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let assistantText = '';
        const { signal } = req;
        const handleAbort = () => {
          controller.close();
        };

        if (signal.aborted) {
          controller.close();
          return;
        }

        signal.addEventListener('abort', handleAbort);

        try {
          const completion = await groq.chat.completions.create({
            model: MODEL,
            temperature: 0.35,
            max_tokens: 900,
            stream: true,
            messages: [
              { role: 'system', content: systemPrompt },
              ...recent,
            ],
          });

          for await (const chunk of completion) {
            if (signal.aborted) break;
            const delta = chunk.choices?.[0]?.delta?.content ?? '';
            if (!delta) continue;
            assistantText += delta;
            controller.enqueue(
              encoder.encode(streamEvent('delta', { text: delta }))
            );
          }

          if (signal.aborted) {
            controller.close();
            return;
          }

          const reply = assistantText.trim();
          if (!reply) {
            controller.enqueue(
              encoder.encode(
                streamEvent('error', {
                  message: 'Model returned an empty reply.',
                })
              )
            );
            controller.close();
            return;
          }

          let finalReply = reply;

          // If this is an MCQ request, provide simple link to MCQ section
          if (mcqRequest.isMcqRequest && mcqRequest.topic) {
            const mcqLink = `\n\n🎯 **[Go to MCQ Section →](/dashboard/mcq)**`;
            finalReply += mcqLink;
          }

          const assistantMessage = await addChatMessage(
            thread.id,
            'assistant',
            finalReply
          );

          controller.enqueue(
            encoder.encode(
              streamEvent('done', {
                userMessage: {
                  id: userMessage.id,
                  role: userMessage.role,
                  content: userMessage.content,
                  createdAt: userMessage.created_at,
                },
                assistantMessage: {
                  id: assistantMessage.id,
                  role: assistantMessage.role,
                  content: assistantMessage.content,
                  createdAt: assistantMessage.created_at,
                },
                chatId: thread.chat_id,
                title,
                updatedAt: new Date().toISOString(),
              })
            )
          );
          controller.close();
        } catch (err) {
          if (!signal.aborted) {
            console.error('[chat reply stream]', err);
            controller.enqueue(
              encoder.encode(
                streamEvent('error', { message: 'Failed to generate reply.' })
              )
            );
          }
          controller.close();
        } finally {
          signal.removeEventListener('abort', handleAbort);
          console.log('[chat reply] stream ended', {
            assistantTextLength: assistantText.length,
            aborted: signal.aborted,
          });
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[chat reply POST]', err);
    return NextResponse.json(
      { error: 'Failed to generate reply.' },
      { status: 500 }
    );
  }
}
