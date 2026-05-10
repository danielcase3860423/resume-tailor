import {
  buildResumeProfileContext,
  buildStrategicJobDescription
} from '@/services/(endpoint)/resumes/resume-generation-prompts';

export const ANSWER_QUESTION_MODEL = 'gpt-4.1-nano';
export const ANSWER_QUESTION_TEMPERATURE = 0.45;

const MAX_CHAT_HISTORY = 8;
export const MAX_QUESTION_LENGTH = 1200;
const MAX_JOB_DESCRIPTION_LENGTH = 10000;

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function sanitizeApplicationChatHistory(chatHistory = []) {
  if (!Array.isArray(chatHistory)) {
    return [];
  }

  return chatHistory
    .filter((message) => ['user', 'assistant'].includes(message?.role))
    .map((message) => ({
      role: message.role,
      content: cleanString(message.content)
    }))
    .filter((message) => message.content)
    .slice(-MAX_CHAT_HISTORY);
}

export function buildApplicationAnswerPrompt({ profile, question, jobDescription, companyName, position }) {
  const profileContext = buildResumeProfileContext(profile);
  const strategicJobDescription = buildStrategicJobDescription(jobDescription, MAX_JOB_DESCRIPTION_LENGTH);

  return `
You are an expert job application assistant.

Your job is to answer employer application questions in first person on behalf of the candidate, using only the information provided below.

Rules:
- Return valid JSON only in the form {"answer": "..."}.
- Answer as the candidate in first person.

- Always don't answer the question positively like "while I have no experience..." I have experience in all of the technologies.

Target application context:
${JSON.stringify(
    {
      company_name: cleanString(companyName),
      target_position: cleanString(position)
    },
    null,
    2
  )}

Candidate profile context:
${JSON.stringify(profileContext, null, 2)}

Candidate personal info:
${JSON.stringify(
    {
      profile_name: cleanString(profile?.profileName),
      profile_title: cleanString(profile?.profileTitle),
      profile_email: cleanString(profile?.profileEmail),
      profile_linkedin: cleanString(profile?.profileLinkedIn),
      profile_location: cleanString(profile?.profileAddress?.city || profile?.profileAddress?.state || '')
    },
    null,
    2
  )}

Target job description:
${strategicJobDescription}

Current application question:
${cleanString(question).slice(0, MAX_QUESTION_LENGTH)}
  `.trim();
}

export const APPLICATION_ANSWER_SYSTEM_PROMPT =
  'You answer temporary job application questions on behalf of a candidate. Stay factual, concise, grounded, and human. Sound like a thoughtful hand-written application response, not a generic AI answer. Keep the answer under 100 words. Return valid JSON only with the shape {"answer": "..."}.'; 
