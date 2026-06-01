import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

import {
  addChatMessage,
  getChatThreadByChatId,
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

function buildSystemPrompt(context?: DeepDiveContext | null): string {
  if (!context) {
    return [
      'You are a helpful study tutor for Gamify.',
      'Explain concepts clearly, step-by-step, and use short paragraphs.',
      'If the user asks for depth, include examples and intuition.',
      'If a question is outside the available context, say so and answer generally.',
    ].join('\n');
  }

  return [
    'You are a deep-dive study tutor for Gamify.',
    'Use the provided context to answer and expand with intuition and examples.',
    'If the user asks beyond the context, say so and answer generally.',
    '',
    `Topic: ${context.topic}`,
    `Title: ${context.title}`,
    `Channel: ${context.channelName}`,
    `Source: ${context.sourceUrl}`,
    '',
    'Summary context:',
    context.summary,
  ].join('\n');
}

function streamEvent(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
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

    const userMessage = await addChatMessage(thread.id, 'user', content);

    const history = await listChatMessagesForThread(thread.id);
    const recent = history.slice(-12).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const systemPrompt = buildSystemPrompt(body.context);
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

          const assistantMessage = await addChatMessage(
            thread.id,
            'assistant',
            reply
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
