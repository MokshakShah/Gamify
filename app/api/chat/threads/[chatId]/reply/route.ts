import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import {
  addChatMessage,
  getChatThreadByChatId,
  listChatMessagesForThread,
  updateChatThreadTitleByChatId,
} from '@/lib/supabase/chat';

export const dynamic = 'force-dynamic';

const MODEL = 'gemini-2.5-flash';
const API_HOST = 'https://generativelanguage.googleapis.com/v1beta';

type RouteContext = { params: { chatId: string } };

type DeepDiveContext = {
  summaryId: string;
  topic: string;
  title: string;
  channelName: string;
  sourceUrl: string;
  summary: string;
};

function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }
  return apiKey;
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

function toGeminiRole(role: 'user' | 'assistant'): 'user' | 'model' {
  return role === 'assistant' ? 'model' : 'user';
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
      role: toGeminiRole(msg.role),
      parts: [{ text: msg.content }],
    }));

    const apiKey = getGeminiApiKey();
    const systemPrompt = buildSystemPrompt(body.context);

    const response = await fetch(
      `${API_HOST}/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: recent,
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 900,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[gemini reply]', errorText);
      return NextResponse.json(
        { error: 'Failed to generate reply.' },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const reply = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();

    if (!reply) {
      return NextResponse.json(
        { error: 'Model returned an empty reply.' },
        { status: 502 }
      );
    }

    const assistantMessage = await addChatMessage(
      thread.id,
      'assistant',
      reply
    );

    return NextResponse.json({
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
    });
  } catch (err) {
    console.error('[chat reply POST]', err);
    return NextResponse.json(
      { error: 'Failed to generate reply.' },
      { status: 500 }
    );
  }
}
