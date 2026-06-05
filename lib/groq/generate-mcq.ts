import Groq from 'groq-sdk';

export type McqQuestionData = {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string; // Now required
};

function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured.');
  }
  return new Groq({ apiKey });
}

function buildMcqPrompt(
  topic: string,
  count: number,
  context?: string
): string {
  const basePrompt = `Generate exactly ${count} multiple choice questions about "${topic}".

${context ? `Context to base questions on:\n${context}\n\n` : ''}

Requirements:
- Each question should be clear and specific
- Provide 4 options (A, B, C, D) with only ONE correct answer
- MUST include a detailed explanation for each correct answer (mandatory)
- Questions should range from basic to intermediate difficulty
- Avoid ambiguous or trick questions
- Explanations should start with "Answer is [X] because..." format and be educational

Format your response as a valid JSON array with this exact structure:
[
  {
    "question": "Question text here?",
    "option_a": "First option",
    "option_b": "Second option", 
    "option_c": "Third option",
    "option_d": "Fourth option",
    "correct_answer": "A",
    "explanation": "Answer is A because [detailed explanation of why this answer is correct and why others are wrong]"
  }
]

IMPORTANT: Every explanation MUST start with "Answer is [X] because..." where X is the correct option letter. Generate exactly ${count} questions in this JSON format. Do not include any other text or formatting.`;

  return basePrompt;
}

export async function generateMcqQuestions(
  topic: string,
  count: number = 10,
  context?: string
): Promise<McqQuestionData[]> {
  if (count > 15) {
    throw new Error('Maximum 15 MCQs can be generated at once');
  }
  if (count < 1) {
    throw new Error('At least 1 MCQ must be generated');
  }

  const groq = getGroq();
  const prompt = buildMcqPrompt(topic, count, context);

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: 'You are an expert question generator. Generate high-quality multiple choice questions in the exact JSON format requested.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const response = completion.choices[0]?.message?.content?.trim();
    if (!response) {
      throw new Error('No response from AI model');
    }

    // Parse the JSON response
    let questions: McqQuestionData[];
    try {
      questions = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', response);
      throw new Error('Invalid response format from AI model');
    }

    // Validate the structure
    if (!Array.isArray(questions)) {
      throw new Error('Response is not an array');
    }

    // Validate each question
    const validatedQuestions: McqQuestionData[] = [];
    for (const q of questions) {
      if (
        typeof q.question === 'string' &&
        typeof q.option_a === 'string' &&
        typeof q.option_b === 'string' &&
        typeof q.option_c === 'string' &&
        typeof q.option_d === 'string' &&
        ['A', 'B', 'C', 'D'].includes(q.correct_answer) &&
        typeof q.explanation === 'string' && q.explanation.trim().length > 0
      ) {
        validatedQuestions.push(q);
      }
    }

    if (validatedQuestions.length === 0) {
      throw new Error('No valid questions generated');
    }

    return validatedQuestions.slice(0, count); // Ensure we don't exceed requested count
  } catch (error) {
    console.error('MCQ generation failed:', error);
    throw error;
  }
}