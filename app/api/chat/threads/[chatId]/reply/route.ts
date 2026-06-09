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
import { generateMcqQuestions } from '@/lib/groq/generate-mcq';
import { createOrMergeMcqSet, addMcqQuestions } from '@/lib/supabase/mcq';

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
    '- Simply say "MCQs are generated in the MCQ section" and redirect them',
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

function detectMcqRequest(content: string): { isMcqRequest: boolean; topic?: string; count?: number; isContextual?: boolean } {
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

  // Check if it's a contextual request (no specific topic mentioned)
  const contextualPatterns = [
    /(?:give|generate|create|make)\s*(?:\d+\s*)?(?:more|additional|extra)\s*(?:mcq|questions?|quiz)/i,
    /(?:\d+\s*)?more\s*(?:mcq|questions?|quiz)/i,
    /(?:some|few)\s*more\s*(?:mcq|questions?)/i,
    /(?:add|give me)\s*(?:\d+\s*)?(?:more|additional)\s*(?:mcq|questions?)/i,
    /(?:pls|please).*(?:more|additional).*(?:mcq|questions?)/i
  ];

  const isContextual = contextualPatterns.some(pattern => pattern.test(content));

  if (isContextual) {
    return {
      isMcqRequest: true,
      topic: '', // Will be filled from context
      count,
      isContextual: true
    };
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

  return {
    isMcqRequest: true,
    topic: topic || 'general knowledge',
    count,
    isContextual: false
  };
}

async function extractTopicFromChatHistory(messages: any[]): Promise<string | null> {
  // Look through recent chat messages for MCQ-related topics
  const recentMessages = messages.slice(-10); // Last 10 messages

  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const message = recentMessages[i];

    // Skip assistant messages for topic extraction
    if (message.role === 'assistant') continue;

    const content = message.content.toLowerCase();

    // Look for previous MCQ requests with explicit topics
    const mcqDetection = detectMcqRequest(message.content);
    if (mcqDetection.isMcqRequest && mcqDetection.topic && !mcqDetection.isContextual) {
      console.log(`Found previous MCQ topic from chat history: "${mcqDetection.topic}"`);
      return mcqDetection.topic;
    }

    // Look for educational topics being discussed
    const topicPatterns = [
      // Academic subjects
      /(?:studying|learning|about)\s+(.+?)(?:\s|$|\.|\?|!)/i,
      /(?:explain|tell me about|what is)\s+(.+?)(?:\s|$|\.|\?|!)/i,
      /(?:topic|subject|course).*?(?:is|was|about)\s+(.+?)(?:\s|$|\.|\?|!)/i,
      // Technical topics
      /(?:algorithm|method|concept|theory).*?(?:of|for|about)\s+(.+?)(?:\s|$|\.|\?|!)/i,
    ];

    for (const pattern of topicPatterns) {
      const match = content.match(pattern);
      if (match) {
        const potentialTopic = match[1].trim();
        // Filter out very generic or short words
        if (potentialTopic.length > 2 && !['it', 'this', 'that', 'how', 'what', 'why'].includes(potentialTopic)) {
          console.log(`Extracted topic from conversation: "${potentialTopic}"`);
          return potentialTopic;
        }
      }
    }
  }

  return null;
}

async function generateIntelligentTitle(
  userMessage: string,
  context?: DeepDiveContext | null,
  pdfChunks?: ChatAttachmentChunkRow[]
): Promise<string> {
  try {
    const groq = getGroq();

    // Build context for title generation
    let contextInfo = '';
    if (context) {
      contextInfo = `Video context: "${context.title}" about ${context.topic}`;
    } else if (pdfChunks && pdfChunks.length > 0) {
      contextInfo = 'PDF document content available';
    }

    const prompt = `Based on this user request and context, generate a concise, descriptive title (max 50 characters) for an MCQ quiz set.

User request: "${userMessage}"
${contextInfo ? `Context: ${contextInfo}` : ''}

The title should:
- Be specific and descriptive
- Indicate the main topic or subject
- Be suitable for a quiz/study set
- NOT include "MCQ" or "Quiz" in the title (this will be added automatically)
- Be clear and helpful for later reference

Examples:
- "Cure Clustering Algorithms"
- "Machine Learning Basics" 
- "Photosynthesis Process"
- "JavaScript Promises"

Generate only the title, nothing else:`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 50,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating concise, descriptive titles for educational content. Generate clear, specific titles that help users identify their study materials.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const generatedTitle = completion.choices[0]?.message?.content?.trim();
    if (generatedTitle && generatedTitle.length > 0 && generatedTitle.length <= 50) {
      return generatedTitle;
    }
  } catch (error) {
    console.error('Title generation failed:', error);
  }

  // Fallback to simple extraction
  return extractSimpleTitle(userMessage, context);
}

function extractSimpleTitle(userMessage: string, context?: DeepDiveContext | null): string {
  // If we have context from video, try to use that
  if (context?.topic) {
    return context.topic;
  }

  // Try to extract a meaningful topic from the user message
  const cleanMessage = userMessage.toLowerCase().trim();

  // Remove common MCQ request words
  const cleaned = cleanMessage
    .replace(/\b(mcq|mcqs|multiple choice|quiz|questions?|generate|create|make|give me|about|on)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length > 0 && cleaned.length <= 50) {
    // Capitalize first letter of each word
    return cleaned.replace(/\b\w/g, l => l.toUpperCase());
  }

  // Last resort fallback
  return 'Study Questions';
}

function formatSetTitle(title: string, sourceType: string): string {
  const maxLength = 60;
  let suffix = '';

  switch (sourceType) {
    case 'pdf':
      suffix = ' (PDF)';
      break;
    case 'youtube':
      suffix = ' (Video)';
      break;
    default:
      suffix = '';
  }

  const baseTitle = title.length + suffix.length > maxLength
    ? title.substring(0, maxLength - suffix.length - 3) + '...'
    : title;

  return `${baseTitle}${suffix}`;
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

          // If this is an MCQ request, generate MCQs in background and show simple link
          if (mcqRequest.isMcqRequest) {
            let finalTopic = mcqRequest.topic;

            // If it's a contextual request ("give me more MCQs"), extract topic from chat history
            if (mcqRequest.isContextual || !finalTopic || finalTopic === 'general knowledge') {
              console.log('Contextual MCQ request detected, analyzing chat history...');

              const contextualTopic = await extractTopicFromChatHistory(history);

              if (contextualTopic) {
                finalTopic = contextualTopic;
                console.log(`Using contextual topic: "${finalTopic}"`);
              } else {
                // If no context found, inform user
                finalReply += '\n\n❓ I need more context. Could you specify what topic you\'d like MCQs on? For example: "Generate 5 MCQs on machine learning" or "Create questions about React hooks".';

                const message = await addChatMessage(
                  thread.id,
                  'assistant',
                  finalReply
                );

                controller.enqueue(
                  encoder.encode(streamEvent('message', { message }))
                );
                controller.close();
                return;
              }
            }

            // Proceed with MCQ generation using the final topic
            if (finalTopic) {
              try {
                // Generate context for MCQ generation
                let mcqContext = '';
                if (body.context?.summary) {
                  mcqContext = body.context.summary;
                } else if (pdfChunks && pdfChunks.length > 0) {
                  mcqContext = pdfChunks.slice(0, 10).map(chunk => chunk.content).join('\n\n');
                }

                // Determine source type
                let sourceType: 'topic' | 'pdf' | 'youtube' = 'topic';
                let sourceId: string | undefined;

                if (body.context) {
                  sourceType = 'youtube';
                  sourceId = body.context.summaryId;
                } else if (pdfChunks && pdfChunks.length > 0) {
                  sourceType = 'pdf';
                }

                // Generate MCQs in background
                const mcqQuestions = await generateMcqQuestions(
                  finalTopic,
                  mcqRequest.count || 10,
                  mcqContext
                );

                if (mcqQuestions.length > 0) {
                  // Generate intelligent title based on conversation context
                  const intelligentTitle = await generateIntelligentTitle(
                    content,
                    body.context,
                    pdfChunks
                  );

                  // Create or merge MCQ set intelligently
                  const result = await createOrMergeMcqSet(
                    userId,
                    formatSetTitle(intelligentTitle, sourceType),
                    finalTopic,
                    sourceType,
                    sourceId
                  );

                  if (result.mcqSet) {
                    // Add questions to database (with proper ordering for merged sets)
                    await addMcqQuestions(
                      result.mcqSet.id,
                      mcqQuestions.map((q) => ({
                        ...q,
                        // Remove question_order here - let addMcqQuestions handle auto-ordering
                      }))
                    );

                    // Show success message with context about merge/new
                    let successMessage = '';
                    if (result.merged) {
                      if (mcqRequest.isContextual) {
                        successMessage = `\n\n✅ **Added ${mcqQuestions.length} more MCQs to existing "${result.mcqSet.title.replace(/\s*\((Video|PDF)\)$/, '')}" set!** [Go to MCQ Section →](/dashboard/mcq)`;
                      } else {
                        successMessage = `\n\n✅ **MCQ questions added to existing "${result.mcqSet.title.replace(/\s*\((Video|PDF)\)$/, '')}" set!** [Go to MCQ Section →](/dashboard/mcq)`;
                      }
                    } else {
                      successMessage = `\n\n✅ **New MCQ set created!** [Go to MCQ Section →](/dashboard/mcq)`;
                    }
                    finalReply += successMessage;
                  } else {
                    const mcqLink = `\n\n🎯 **[Go to MCQ Section →](/dashboard/mcq)**`;
                    finalReply += mcqLink;
                  }
                } else {
                  const mcqLink = `\n\n🎯 **[Go to MCQ Section →](/dashboard/mcq)**`;
                  finalReply += mcqLink;
                }
              } catch (mcqError) {
                console.error('MCQ generation failed:', mcqError);
                // Even if generation fails, still show link
                const mcqLink = `\n\n🎯 **[Go to MCQ Section →](/dashboard/mcq)**`;
                finalReply += mcqLink;
              }
            } // Close the if (finalTopic) block
          } // Close the if (mcqRequest.isMcqRequest) block

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
