export const dynamic = 'force-dynamic';
export const revalidate = 0;

import OpenAI from 'openai';
import { sendError } from '@/helpers/endpoint';
import {
  ANSWER_QUESTION_MODEL,
  ANSWER_QUESTION_TEMPERATURE,
  MAX_QUESTION_LENGTH,
  APPLICATION_ANSWER_SYSTEM_PROMPT,
  buildApplicationAnswerPrompt,
  sanitizeApplicationChatHistory
} from '@/services/(endpoint)/resumes/answer-question-prompts';

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseAnswer(content) {
  const text = cleanString(content);

  try {
    const parsed = JSON.parse(text);
    return cleanString(parsed?.answer || parsed?.response || '');
  } catch {
    return text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  }
}

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return sendError(Response, { msg: 'OPENAI_API_KEY is not configured' });
    }

    const { question, jobDescription, companyName, position, profile, chatHistory } = await req.json();

    if (!cleanString(question)) {
      return sendError(Response, { msg: 'Question is required' });
    }

    if (!cleanString(jobDescription)) {
      return sendError(Response, { msg: 'Job description is required' });
    }

    if (!profile || typeof profile !== 'object') {
      return sendError(Response, { msg: 'Profile is required' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = buildApplicationAnswerPrompt({
      profile,
      question: cleanString(question).slice(0, MAX_QUESTION_LENGTH),
      jobDescription,
      companyName,
      position
    });

    const messages = [
      {
        role: 'system',
        content: APPLICATION_ANSWER_SYSTEM_PROMPT
      },
      ...sanitizeApplicationChatHistory(chatHistory),
      { role: 'user', content: prompt }
    ];

    const completion = await openai.chat.completions.create({
      model: ANSWER_QUESTION_MODEL,
      temperature: ANSWER_QUESTION_TEMPERATURE,
      response_format: { type: 'json_object' },
      messages
    });

    const content = completion?.choices?.[0]?.message?.content;
    const answer = parseAnswer(content);

    if (!answer) {
      return sendError(Response, { msg: 'Failed to generate an answer.' });
    }

    return Response.json({ result: 'success', answer });
  } catch (error) {
    console.error('answer-question error:', error);
    return sendError(Response, { msg: error?.message || 'Failed to answer question.' });
  }
}
