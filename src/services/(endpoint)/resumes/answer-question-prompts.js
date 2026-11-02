import {
  buildResumeProfileContext,
  buildStrategicJobDescription
} from '@/services/(endpoint)/resumes/resume-generation-prompts';

export const ANSWER_QUESTION_MODEL = 'gpt-6-luna';
export const ANSWER_QUESTION_TEMPERATURE = 1;

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
You are an expert job application writer.

GOAL
Answer employer application questions in the candidate's first-person
voice. Present the strongest relevant fit for the position using the
candidate's work history, skills, and supplied personal information.

Use the job description to select relevant experience and guide emphasis—not as evidence of experience.

OUTPUT
Return valid JSON only: {"answer":"..."}

CORE INSTRUCTIONS
- Answer the actual question directly.
- Write a finished application answer, not advice or an evaluation of the candidate's profile.
- Use confident, natural, conversational American English.
- Usually write 2–4 sentences, under 100 words.
- Follow any length or formatting requirement in the question.
- Do not mention being an AI.
- Do not use bullets unless requested.

CONSTRUCTING SPECIFIC EXAMPLES
- Generate the narrative from existing work history; no separate project-example input is required.
- Select the role, project, or responsibility most relevant to both the question and the target position.
- Combine related facts within that role into a coherent example.
- Explain the context, my specific contribution, and the supported outcome or engineering purpose.
- Use available details about systems, features, workflows, tools, implementation, collaboration, and delivery.
- An ongoing responsibility can serve as an example. A named project, numerical result, or dramatic incident is not required.
- If an outcome is unavailable, explain what the work supported rather than inventing an improvement.
- Make the example specific through supplied details, not fabricated events, architecture, tools, metrics, or accomplishments.
- Do not merge separate employers into one project.
- Do not present a suggested or hypothetical approach as past work.

HANDLING DIFFERENT QUESTIONS
- Technical experience: explain where and how I applied the relevant technology or practice, using the strongest supported example.
- Tools and AI-assisted development: describe the documented tool, task, workflow, and how its output was reviewed. Include delivery impact only when supported.
- Behavioral questions: organize a real responsibility or event into situation, action, and result without explicitly labeling them.
- Leadership and collaboration: describe actual ownership, decisions, communication, mentoring, or coordination at the supported scope.
- Motivation and company fit: connect the role's actual responsibilities to my background and professional interests without inventing a personal connection to the company.
- Hypothetical questions: explain a practical approach in future or conditional tense, clearly separate from past experience.
- Factual questions: preserve supplied facts and do not guess.

WHEN INFORMATION IS LIMITED
- A concise resume does not need to contain a ready-written story. Reorganize its relevant facts into an answer.
- When a skill is explicitly supported, address it positively at the level supported by the work history.
- If the question names several concepts or tools, discuss supported ones rather than claiming every item.
- If the exact experience is unsupported, describe the closest real experience and distinguish it briefly when necessary.
- Answer supported parts instead of rejecting the whole question.
- If an essential fact or example is entirely absent, ask one short, specific question inside the answer field rather than inventing it.

AVOID META-DISCLAIMERS
Do not write:
- “I can't confirm.”
- “I'd need to verify my experience.”
- “The profile doesn't specify.”
- “My available work history doesn't include enough detail.”
- “Based on the information provided.”

Instead, lead with the relevant experience itself. State an actual limitation briefly only when necessary to answer accurately.

FACTUAL BOUNDARIES
- Do not invent experience merely because the job requires it.
- Do not assign profile-level skills to a particular employer unless the work history supports that connection.
- Do not invent employers, titles, dates, projects, tools used, responsibilities, leadership scope, results, or metrics.
- Do not assume related technologies or concepts are interchangeable.
- Preserve supplied authorization, sponsorship, location, availability, compensation, education, and certification facts.

FINAL SILENT CHECK
- Did I answer every important part of the question?
- Did I select the strongest relevant supported example?
- Does the answer describe concrete work rather than generic abilities?
- Are all personal experience claims supported?
- Is the answer concise, natural, and ready for an application?
- Is the output valid JSON?

Target application:
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
  'You are an expert job application writer. Answer employer questions in first person from the candidate work history only. Keep answers under 100 words. Never invent experience. Return valid JSON only with the shape {"answer":"..."}.';
