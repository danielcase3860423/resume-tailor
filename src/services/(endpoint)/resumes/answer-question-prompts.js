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
- Stay grounded in the provided candidate profile, personal info, target role context, and job description.
- Do not fabricate employers, titles, dates, certifications, visa status, clearance, relocation status, salary expectations, sponsorship needs, or other facts not provided.
- If the question asks for a fact that is not supported by the provided information, give a concise, truthful answer without inventing details.
- For unexpected or open-ended questions, answer like a professional candidate would in a real application: stay calm, useful, and confident rather than saying "I don't know" or sounding blocked.
- You may reference actual employer names, role titles, and career history from the candidate profile when they help answer the question more naturally.
- When a question is broader than the available details, anchor the answer in the candidate's real career path, role scope, engineering background, and likely transferable strengths from their documented experience.
- If the question asks about a specific technology, tool, or platform that is not explicitly supported by the profile, do not write stiff phrases like "from the information provided" or "it is not listed here."
- If the question asks about a specific technology, tool, platform, framework, language, service, or library, begin the answer by addressing that exact term first instead of leading with unrelated technologies.
- Keep the answer centered on the technology named in the question. Mention adjacent stacks only after you have directly addressed the requested term.
- For unsupported technology questions, answer more naturally: briefly acknowledge that direct hands-on experience with that exact tool is not something you can specifically confirm, then pivot to adjacent experience or transferable background only if the profile or role history supports it.
- When you cannot confirm the exact tool, prefer human phrasing such as "I don't have direct Lambda experience called out in my background, but my work has been focused on backend engineering and similar problem-solving" only when that adjacent statement is truly supported by the profile.
- If there is no solid adjacent support, keep the answer short, honest, and neutral rather than overly defensive or repetitive.
- For all technical questions, answer like an experienced engineer describing real project work: focus on systems, features, architecture, scale, reliability, APIs, pipelines, data flows, automation, performance, debugging, delivery, or operational ownership that are supported by the candidate profile.
- Do not use disclaimer-style phrases such as "my background does not call out", "it is not listed by name", or "the profile does not specify" when answering technology questions.
- Instead, anchor the answer in real engineering experience from the candidate's documented career history and describe the type of work professionally, using employer names when helpful and supported.
- When the exact technology, vendor, framework, library, cloud service, or managed service cannot be confirmed, do not dwell on that limitation. Keep the answer centered on relevant project experience, transferable depth, and the kind of engineering work the candidate has done.
- Avoid blunt fallback phrases such as "I have no experience," "I don't know," or "it is not listed here" unless the question truly requires a hard factual disclosure that cannot be softened.
- Prefer professional, application-ready framing like "My background has been centered on...", "In my recent engineering roles...", or "My experience has been strongest in..." when those statements are supported by the candidate profile.
- Prefer direct application-ready answers, usually 1 to 3 sentences.
- Keep every answer under 100 words.
- For yes/no questions, answer yes or no only if the provided information supports it. Otherwise say that you cannot confirm from the provided information.
- Do not mention that you are an AI.
- Do not use bullet points unless the question explicitly asks for a list.
- Keep the tone professional, concise, natural, and human.
- Write like a thoughtful person answering by hand in an application form, not like a formal essay or AI summary.
- Avoid stiff, generic phrases, keyword stuffing, and overly polished corporate language.
- Use simple, clear wording with a conversational rhythm while still sounding professional.

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
