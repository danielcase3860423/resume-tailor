import OpenAI from 'openai';
import {
  RESUME_GENERATION_MODEL,
  RESUME_GENERATION_TEMPERATURE,
  RESUME_GENERATION_PROMPT_VERSION,
  buildResumeGenerationPrompt,
  buildResumeProfileContext,
  buildRoleExpansionPrompt,
  buildStrategicJobDescription,
  extractJobDescriptionTechnicalTerms,
  extractProtectedJobDescriptionNames,
  extractTargetCompanyName,
  inferTargetEngineeringLane
} from '@/services/(endpoint)/resumes/resume-generation-prompts';

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

const SKILL_CATEGORY_UPPERCASE_WORDS = new Set([
  'api', 'apis', 'aws', 'ci/cd', 'css', 'c#', 'c++', 'db', 'devops', 'erp',
  'etl', 'gcp', 'html', 'ios', 'ml', 'nlp', 'qa', 'rtos', 'sre', 'sql', 'ui', 'ux'
]);

const NON_SKILL_PATTERNS = [
  /\b(?:location|remote|onsite|hybrid|work environment|salary|compensation|benefits|medical|dental|vision|pto|vacation|401k|401 plan|employer paid|us-remote)\b/i,
  /\b(?:unlimited pto|work from home)\b/i
];

const SOFT_SKILL_CATEGORY_PATTERNS = [
  /\bsoft skills?\b/i,
  /\bcollaboration\b/i,
  /\bcommunication\b/i,
  /\bleadership\b/i,
  /\bmentoring\b/i,
  /\bstakeholder\b/i,
  /\bconflict resolution\b/i,
  /\bemotional regulation\b/i,
  /\binterpersonal\b/i
];

const INVALID_WORK_EXPERIENCE_PATTERNS = [
  /\bfor more information\b/i,
  /\bor a related technical field\b/i,
  /\bwork in us\s*-\s*remote\b/i,
  /\bremote environments?\b/i,
  /\bunlimited pto\b/i,
  /\bmore information\s+\d/i,
  /\b\d{3,}\.\d{2}\b/,
  /\bai\s*&\s*agentic interests\b/i,
  /\bas an [a-z][a-z0-9 /-]* responsibilities\b/i,
  /\bcloud\s*&\s*cicd mastery\b/i,
  /\btool-use and state management\b/i,
  /\band well-documented code\b/i
];

// ---------------------------------------------------------------------------
// Role expansion system prompt
// ---------------------------------------------------------------------------

const ROLE_EXPANSION_SYSTEM_PROMPT = `
You are a technical resume writer with full-cycle recruitment experience and deep
familiarity with ATS systems and modern hiring practices.

Your task: convert a real work experience entry into grounded, low-hallucination
context that helps a resume writer infer likely responsibilities and technologies.

═══════════════════════════════════════
ANTI-HALLUCINATION RULES (STRICT)
═══════════════════════════════════════
- NEVER invent specific tools, frameworks, or architectures unless strongly implied
  by the job title + employer type + provided profile context.
- NEVER assume senior-level ownership unless the title or context clearly signals it
  (e.g. "Lead", "Staff", "Principal", "Head of").
- NEVER fabricate products, internal systems, company-specific projects, or metrics.
- Do not force every job-description term into every role. Keep older or less relevant
  roles broader when needed.

═══════════════════════════════════════
SPECIFICITY RULES
═══════════════════════════════════════
- For current, recent, senior, or highly relevant roles, you MAY use exact named tools
  from the target job description when they plausibly fit the title, lane, and era of
  the role.
- For older, junior, or weak-signal roles, prefer broader but still concrete language
  unless there is a clear reason to be specific.
- Prefer exact platform names over generic labels when the match is plausible.
- Use named cloud, AI/ML, data, and DevOps tools for modern software roles when they are
  consistent with the role title, target engineering lane, and job-description checklist.
- Keep specificity realistic by role: do not place every named technology into every role,
  and do not overload older roles with stacks that read like the current job description.

═══════════════════════════════════════
INFERENCE GUIDELINES
═══════════════════════════════════════
- Infer responsibilities from: job title + seniority level + employer type/industry.
- Infer tech stack at the highest justified confidence level.
- Delivery practices should match typical standards for that role level and industry.
- Seniority signals should reflect linguistic cues in the title or implied scope,
  not assumed growth.
- Do NOT write finished resume bullets or achievement bullets. Provide only structured
  role context that a later resume-writing stage can use.

═══════════════════════════════════════
OUTPUT RULES
═══════════════════════════════════════
- Return VALID JSON ONLY.
- No markdown fences, no commentary, no preamble.
- All string arrays must have 5-8 items unless otherwise noted.
- "confidence_flags" must only flag fields where inference was uncertain.

SCHEMA:
{
  "inferred_responsibilities": string,
  "likely_tech_stack": string[],
  "delivery_practices": string[],
  "seniority_signals": string,
  "ats_keywords": string[],
  "scope_of_impact": "individual" | "team" | "org" | "cross-org",
  "confidence_flags": {
    "tech_stack": "high" | "medium" | "low",
    "responsibilities": "high" | "medium" | "low",
    "seniority": "high" | "medium" | "low"
  }
}
`;

// ---------------------------------------------------------------------------
// Quality rewrite system prompt
// ---------------------------------------------------------------------------

const RESUME_QUALITY_REWRITE_SYSTEM_PROMPT = `
You are a senior resume editor focused on human writing quality.

Your job is to rewrite resume JSON so it reads like a thoughtful, credible, human-written resume.

Rules:
- Return valid JSON only.
- Preserve employers, job titles, employment dates, education, and overall schema.
- Do not fabricate companies, dates, certifications, metrics, or major responsibilities.
- Improve logic, coherence, and realism.
- Remove repetitive phrasing, weak filler, stitched clauses, keyword chains, and awkward tool lists.
- Each work experience bullet must express one clear idea with natural wording.
- Prefer believable engineering statements over ATS-heavy jargon.
- Keep technical terms that genuinely fit, but do not overload a single bullet with many tools.
- Summary lines should sound confident and specific, not generic or boastful.
- technical_skills must stay as concise skill names only.
`.trim();

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function uniqueStrings(values, maxItems = Number.POSITIVE_INFINITY) {
  const results = [];
  const seen = new Set();

  for (const value of values) {
    const item = cleanString(value);
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(item);
    if (results.length >= maxItems) break;
  }

  return results;
}

function normalizeTechnologyPhrases(value) {
  return cleanString(value)
    .replace(/\bAIML\b/gi, 'AI/ML')
    .replace(/\bAI\s*\/?\s*ML\b/gi, 'AI/ML')
    .replace(/\bCI\s*\/?\s*CD\b/gi, 'CI/CD')
    .replace(/\bCICD\b/g, 'CI/CD')
    .replace(/\bg\s*RPC\b/gi, 'gRPC')
    .replace(/\bgrpc\b/g, 'gRPC')
    .replace(/\bGit Hub\b/g, 'GitHub')
    .replace(/\bGit Lab\b/g, 'GitLab')
    .replace(/\bCloud Watch\b/g, 'CloudWatch')
    .replace(/\bPostgre SQL\b/g, 'PostgreSQL')
    .replace(/\bMy SQL\b/g, 'MySQL')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanResumeLine(value) {
  let text = normalizeTechnologyPhrases(value);

  text = text.replace(/\be\.g\.,?\s*/gi, '');
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\b([A-Za-z][A-Za-z0-9/-]*)\s+\1\b/gi, '$1');
  text = text.replace(/\band\s+and\b/gi, 'and');
  text = text.replace(/([,.;:])\1+/g, '$1');
  text = text.replace(/\s+([,.;:])/g, '$1');

  const open = (text.match(/\(/g) || []).length;
  const close = (text.match(/\)/g) || []).length;

  if (open > close) text += ')'.repeat(open - close);
  if (close > open) text = text.replace(/\)+$/g, '');

  text = text.replace(/\b(with|and|using|including)$/i, '');
  text = text.replace(/[,;:\-]+$/g, '');
  text = text.replace(/^[,;:.-]+|[,;:.-]+$/g, '');
  text = text.trim();

  if (!text) return '';

  text = text.charAt(0).toUpperCase() + text.slice(1);
  return text.trim();
}

function validateBullet(text) {
  const normalized = cleanString(text);
  if (normalized.length < 12) return false;
  if (/[({\[]$/.test(normalized)) return false;
  if (/\b(and|with|using|including)$/i.test(normalized)) return false;
  return true;
}

function cleanWorkExperienceBullet(value) {
  let text = cleanResumeLine(value);

  text = text
    .replace(/\bS3Blob\b/g, 'S3 object storage')
    .replace(/\bas an [^,.]* responsibilities\b/gi, '')
    .replace(/\busing or cloud-native solutions\b/gi, '')
    .replace(/\bincluding and [^,.]*$/gi, '')
    .replace(/\band well-documented code\b/gi, '')
    .replace(/\band infrastructure updates\b/gi, '')
    .replace(/\band deploy infrastructure modules\b/gi, '')
    .replace(/\bincluding\s+\(([^)]+)\)$/i, 'including $1')
    .replace(/\/([A-Za-z])/g, '$1')
    .replace(/\b([A-Za-z][A-Za-z0-9/-]*(?:\s+[A-Za-z][A-Za-z0-9/-]*){1,5})\s+and\s+\1\b/gi, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleanResumeLine(text);
}

function validateWorkExperienceBullet(text) {
  const normalized = cleanWorkExperienceBullet(text);
  if (!validateBullet(normalized)) return false;
  if (INVALID_WORK_EXPERIENCE_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  if (/\b(?:including|using)\s*\([^)]+\)?$/i.test(normalized)) return false;
  if (/\b[a-z]+(?:\s+[a-z]+){0,3}\s+and\s+\1\b/i.test(normalized)) return false;
  return true;
}

function buildResumeQualityRewritePrompt({ resumeJson, profileContext, jobDescription }) {
  return `
Rewrite this resume JSON to improve human writing quality and logical flow.

Focus:
1. Make the summary sharper, more credible, and more natural.
2. Rewrite work experience bullets so they sound like real project experience.
3. Remove stitched wording, repetitive connectors, awkward keyword chains, and robotic phrasing.
4. Keep the candidate aligned to the target job description, but do not force every term if it harms readability.
5. Each bullet should contain one main idea, with natural technical detail.
6. Keep the response as valid JSON in the same schema.

Candidate source profile JSON:
${JSON.stringify(profileContext, null, 2)}

Target job description:
${jobDescription}

Resume JSON to improve:
${JSON.stringify(resumeJson, null, 2)}
`.trim();
}

function normalizeTextList(value, maxItems) {
  if (Array.isArray(value)) {
    return uniqueStrings(
      value.map((item) => cleanResumeLine(item)).filter((item) => item && validateBullet(item)),
      maxItems
    );
  }

  if (typeof value === 'string') {
    const parts = value
      .split(/\n+/)
      .flatMap((line) => line.split(/(?:^|\s)[-*]\s+/))
      .map((item) => cleanResumeLine(item.replace(/^[\s*-]+/, '').trim()))
      .filter((item) => item && validateBullet(item));
    return uniqueStrings(parts, maxItems);
  }

  return [];
}

function normalizeSkillSource(value) {
  if (Array.isArray(value)) return value.flatMap((item) => normalizeSkillSource(item));
  if (typeof value !== 'string') return [];

  return value
    .split(/\n+/)
    .flatMap((line) => line.split(/(?:^|\s)[-*]\s+/))
    .flatMap((item) => item.split(/\s*[;,]\s*/))
    .flatMap((item) => splitCompoundSkillItem(item))
    .map((item) => item.replace(/^[\s*-]+/, '').trim())
    .filter(Boolean);
}

function splitCompoundSkillItem(value) {
  const item = cleanString(value);
  if (!/\sand\s/i.test(item)) return [item];

  const parts = item.split(/\s+\band\b\s+/i).map((part) => cleanString(part)).filter(Boolean);
  if (parts.length !== 2) return [item];

  const wordCount = item.split(/\s+/).filter(Boolean).length;
  if (wordCount > 6) return [item];

  const [left, right] = parts;
  const rightWords = right.split(/\s+/).filter(Boolean);

  if (rightWords.length > 1 && left.split(/\s+/).length === 1) {
    const sharedSuffix = rightWords.slice(1).join(' ');
    return [`${left} ${sharedSuffix}`.trim(), right].filter(Boolean);
  }

  return parts;
}

function cleanSkillItem(value) {
  let item = normalizeTechnologyPhrases(value)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\bcheck(?=[A-Z])/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(?:skills?|category|location)\s*:\s*/i, '')
    .replace(/\be\.g\.,?\s*/gi, '')
    .trim();

  const openParenCount = (item.match(/\(/g) || []).length;
  const closeParenCount = (item.match(/\)/g) || []).length;
  if (openParenCount > closeParenCount) item = item.replace(/\([^()]*$/g, '').trim();

  item = item.replace(/\)+$/g, '').replace(/^[,;:.-]+|[,;:.-]+$/g, '').trim();
  return item;
}

function isValidSkillItem(value) {
  const item = cleanString(value);
  if (!item) return false;
  if (NON_SKILL_PATTERNS.some((pattern) => pattern.test(item))) return false;
  return item.split(/\s+/).length <= 6;
}

function normalizeSkillList(value, maxItems) {
  return uniqueStrings(
    normalizeSkillSource(value).map((item) => cleanSkillItem(item)).filter((item) => isValidSkillItem(item)),
    maxItems
  );
}

function formatSkillCategory(value) {
  const normalized = cleanString(value)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9+#/&.-]+$/g, '')
    .trim();

  if (!normalized) return '';

  return normalized
    .split(' ')
    .map((word) => {
      const lowerWord = word.toLowerCase();
      if (SKILL_CATEGORY_UPPERCASE_WORDS.has(lowerWord)) return word.toUpperCase();
      if (word.includes('&') || word.includes('/') || word.includes('.')) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function isTechnicalSkillCategory(value) {
  const category = cleanString(value);
  if (!category) return false;
  return !SOFT_SKILL_CATEGORY_PATTERNS.some((pattern) => pattern.test(category));
}

function normalizeSummary(value) {
  if (Array.isArray(value)) {
    return uniqueStrings(
      value.map((item) => cleanResumeLine(item)).filter((item) => item && validateBullet(item)),
      6
    );
  }

  if (typeof value === 'string') {
    const parts = value
      .split(/\n+/)
      .flatMap((line) => line.split(/(?<=[.!?])\s+/))
      .map((item) => cleanResumeLine(item.replace(/^[\s*-]+/, '').trim()))
      .filter((item) => item && validateBullet(item));
    return uniqueStrings(parts, 6);
  }

  return [];
}

function normalizeTechnicalSkills(technicalSkills) {
  if (!technicalSkills || typeof technicalSkills !== 'object' || Array.isArray(technicalSkills)) return {};

  return Object.entries(technicalSkills).reduce((accumulator, [category, skills]) => {
    const normalizedCategory = formatSkillCategory(category);
    const normalizedSkills = normalizeSkillList(skills, 8);

    if (normalizedCategory && normalizedSkills.length && isTechnicalSkillCategory(normalizedCategory)) {
      accumulator[normalizedCategory] = uniqueStrings(
        [...(accumulator[normalizedCategory] || []), ...normalizedSkills],
        8
      );
    }

    return accumulator;
  }, {});
}

function normalizeWorkExperienceAchievements(value, maxItems) {
  if (Array.isArray(value)) {
    return uniqueStrings(
      value.map((item) => cleanWorkExperienceBullet(item)).filter((item) => item && validateWorkExperienceBullet(item)),
      maxItems
    );
  }

  if (typeof value === 'string') {
    const parts = value
      .split(/\n+/)
      .flatMap((line) => line.split(/(?:^|\s)[-*]\s+/))
      .map((item) => cleanWorkExperienceBullet(item.replace(/^[\s*-]+/, '').trim()))
      .filter((item) => item && validateWorkExperienceBullet(item));
    return uniqueStrings(parts, maxItems);
  }

  return [];
}

function normalizeWorkExperiences(generatedExperiences, sourceExperiences) {
  const generatedList = Array.isArray(generatedExperiences) ? generatedExperiences : [];

  return sourceExperiences.map((sourceExperience, index) => {
    const generatedExperience = generatedList[index] || {};

    return {
      job_title: cleanString(generatedExperience?.job_title) || cleanString(sourceExperience?.job_title),
      company_name: cleanString(generatedExperience?.company_name) || cleanString(sourceExperience?.employer),
      start_date_employment: cleanString(generatedExperience?.start_date_employment) || cleanString(sourceExperience?.start_date),
      end_date_employment: cleanString(generatedExperience?.end_date_employment) || cleanString(sourceExperience?.end_date),
      achievements: normalizeWorkExperienceAchievements(generatedExperience?.achievements, 8)
    };
  });
}

function normalizeResumeResponse(rawResponse, sourceExperiences) {
  return {
    work_experiences: normalizeWorkExperiences(rawResponse?.work_experiences, sourceExperiences),
    summary: normalizeSummary(rawResponse?.summary),
    technical_skills: normalizeTechnicalSkills(rawResponse?.technical_skills),
    target_company_name: cleanString(rawResponse?.target_company_name),
    target_position: cleanString(rawResponse?.target_position)
  };
}

export function extractJsonFromCompletion(rawText) {
  const cleaned = cleanString(rawText).replace(/<scratchpad>[\s\S]*?<\/scratchpad>/gi, '').trim();
  const stripped = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const firstBraceIndex = stripped.indexOf('{');
  const lastBraceIndex = stripped.lastIndexOf('}');
  if (firstBraceIndex === -1 || lastBraceIndex === -1) {
    throw new Error('No JSON object found in completion');
  }
  return stripped.slice(firstBraceIndex, lastBraceIndex + 1);
}

// ---------------------------------------------------------------------------
// Role expansion helpers
// ---------------------------------------------------------------------------

/**
 * A role has rich content when it already carries substantial source data AND
 * it is not a current role. Current roles are always re-expanded so their
 * context stays aligned to the new job description even if they have prior
 * achievements stored from an earlier generation run.
 */
export function hasRichRoleContent(role) {
  const isCurrentRole =
    !role.end_date || cleanString(role.end_date).toLowerCase() === 'present';

  // Always expand current roles — stored achievements may be stale relative
  // to the new JD, and the expansion model will produce fresher context.
  if (isCurrentRole) return false;

  return Boolean(
    cleanString(role.responsibilities) ||
      cleanString(role.description) ||
      cleanString(role.tech_stack) ||
      (Array.isArray(role.achievements) && role.achievements.length >= 3)
  );
}

async function expandRole(role, targetEngineeringLane, jdKeyTerms, callModelFn) {
  if (hasRichRoleContent(role)) return role;

  const prompt = buildRoleExpansionPrompt(role, targetEngineeringLane, jdKeyTerms);

  try {
    const expansion = await callModelFn(
      [
        { role: 'system', content: ROLE_EXPANSION_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      { temperature: 0.4, max_completion_tokens: 900 }
    );

    if (!expansion || typeof expansion !== 'object') return role;

    return {
      ...role,
      responsibilities: cleanString(expansion.inferred_responsibilities) || role.responsibilities,
      tech_stack: Array.isArray(expansion.likely_tech_stack)
        ? expansion.likely_tech_stack.map(cleanString).filter(Boolean).join(', ')
        : role.tech_stack,
      delivery_practices: Array.isArray(expansion.delivery_practices)
        ? expansion.delivery_practices.map(cleanString).filter(Boolean).join('; ')
        : '',
      seniority_context: cleanString(expansion.seniority_signals)
    };
  } catch {
    return role;
  }
}

export async function expandRoles(profileContext, targetEngineeringLane, jdKeyTerms, callModelFn) {
  const expandedRoles = await Promise.all(
    profileContext.work_experiences.map((role) =>
      expandRole(role, targetEngineeringLane, jdKeyTerms, callModelFn)
    )
  );
  return { ...profileContext, work_experiences: expandedRoles };
}

// ---------------------------------------------------------------------------
// Tech term patching helpers
// ---------------------------------------------------------------------------

function tokenizeTerm(value) {
  return cleanString(value)
    .toLowerCase()
    .split(/[^a-z0-9+#./]+/i)
    .filter(Boolean);
}

function computeTextScoreForTerm(term, text) {
  const normalizedText = cleanString(text).toLowerCase();
  if (!normalizedText) return 0;

  let score = 0;
  const loweredTerm = term.toLowerCase();
  if (normalizedText.includes(loweredTerm)) score += 100;

  const termTokens = tokenizeTerm(term);
  for (const token of termTokens) {
    if (token.length <= 1) continue;
    if (normalizedText.includes(token)) score += token.length >= 4 ? 10 : 4;
  }

  if (/(api|service|platform|pipeline|cloud|deploy|build|design|engineer|automate|integrat|develop|implement|maintain|monitor|test|data|model|training)/i.test(normalizedText))
    score += 3;

  return score;
}

function chooseRoleIndexForTerm(term, resumeJson, enrichedProfileContext) {
  let bestIndex = 0;
  let bestScore = -1;

  resumeJson.work_experiences.forEach((role, index) => {
    const enrichedRole = enrichedProfileContext.work_experiences[index] || {};
    const roleText = [
      role.job_title,
      role.company_name,
      ...(role.achievements || []),
      enrichedRole.responsibilities,
      enrichedRole.description,
      enrichedRole.tech_stack,
      enrichedRole.delivery_practices,
      enrichedRole.seniority_context
    ]
      .filter(Boolean)
      .join(' ');

    // Tighter recency bonus (was 10 - index). A strong content signal from a
    // later role should be able to beat the positional advantage of role 0.
    const score = computeTextScoreForTerm(term, roleText) + Math.max(0, 4 - index);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function chooseBulletIndexForTerm(achievements, term) {
  if (!Array.isArray(achievements) || !achievements.length) return -1;

  let bestIndex = 0;
  let bestScore = -1;

  achievements.forEach((achievement, index) => {
    const score =
      computeTextScoreForTerm(term, achievement) +
      (index === 1 ? 8 : 0) +
      (index === 2 ? 6 : 0) +
      (/(api|service|platform|pipeline|cloud|deploy|build|design|engineer|automate|integrat|develop|implement|maintain|monitor|test|data|model)/i.test(achievement)
        ? 5
        : 0);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function cleanPatchTerm(term) {
  return cleanString(term)
    .replace(/^[,;:()[\]\s-]+|[,;:()[\]\s-]+$/g, '')
    .replace(/^(?:and|or|with|using|including|plus)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildPatchedBullet(baseText, term, punctuation) {
  const cleanedBaseText = cleanWorkExperienceBullet(baseText).replace(/[.!?]$/, '').trim();
  const cleanedTerm = cleanPatchTerm(term);

  if (!cleanedBaseText || !cleanedTerm) {
    return cleanWorkExperienceBullet(`${cleanedBaseText || cleanedTerm}${punctuation}`);
  }

  if (cleanedBaseText.toLowerCase().includes(cleanedTerm.toLowerCase())) {
    return cleanWorkExperienceBullet(`${cleanedBaseText}${punctuation}`);
  }

  if (/\b(using|leveraging|utilizing)\b/i.test(cleanedBaseText)) {
    return cleanWorkExperienceBullet(`${cleanedBaseText}, with ${cleanedTerm}${punctuation}`);
  }

  if (/\b(with|including)\b/i.test(cleanedBaseText)) {
    return cleanWorkExperienceBullet(`${cleanedBaseText}, leveraging ${cleanedTerm}${punctuation}`);
  }

  if (/\b(build|built|develop|developed|implement|implemented|design|designed|architect|architected|engineer|engineered|create|created)\b/i.test(cleanedBaseText)) {
    return cleanWorkExperienceBullet(`${cleanedBaseText} using ${cleanedTerm}${punctuation}`);
  }

  if (/\b(deploy|deployed|monitor|monitored|automate|automated|pipeline|release|test|tested|maintain|maintained|support|supported)\b/i.test(cleanedBaseText)) {
    return cleanWorkExperienceBullet(`${cleanedBaseText} with ${cleanedTerm}${punctuation}`);
  }

  return cleanWorkExperienceBullet(`${cleanedBaseText}, including ${cleanedTerm}${punctuation}`);
}

function injectTermIntoBullet(bullet, term) {
  const cleanedBullet = cleanWorkExperienceBullet(bullet);
  if (!cleanedBullet) return cleanPatchTerm(term);

  const cleanedTerm = cleanPatchTerm(term);
  if (!cleanedTerm) return cleanedBullet;

  if (cleanedBullet.toLowerCase().includes(cleanedTerm.toLowerCase())) return cleanedBullet;

  const terminalPunctuationMatch = cleanedBullet.match(/[.!?]$/);
  const punctuation = terminalPunctuationMatch ? terminalPunctuationMatch[0] : '';
  const baseText = punctuation ? cleanedBullet.slice(0, -1) : cleanedBullet;

  const rewrittenBullet = buildPatchedBullet(baseText, cleanedTerm, punctuation);
  return validateWorkExperienceBullet(rewrittenBullet) ? rewrittenBullet : cleanedBullet;
}

export async function patchMissingTechTerms(resumeJson, techTerms, enrichedProfileContext) {
  if (!techTerms?.length || !Array.isArray(resumeJson?.work_experiences)) return resumeJson;

  const flattenedBulletText = resumeJson.work_experiences
    .flatMap((role) => role.achievements || [])
    .join(' ')
    .toLowerCase();

  const missingTerms = techTerms.filter((term) => !flattenedBulletText.includes(term.toLowerCase()));
  if (!missingTerms.length) return resumeJson;

  const patchedResume = {
    ...resumeJson,
    work_experiences: resumeJson.work_experiences.map((role) => ({
      ...role,
      achievements: Array.isArray(role.achievements) ? [...role.achievements] : []
    }))
  };

  for (const term of missingTerms) {
    const roleIndex = chooseRoleIndexForTerm(term, patchedResume, enrichedProfileContext);
    const targetRole = patchedResume.work_experiences[roleIndex];
    if (!targetRole) continue;

    const bulletIndex = chooseBulletIndexForTerm(targetRole.achievements, term);
    if (bulletIndex === -1) continue;

    const patchedBullet = injectTermIntoBullet(targetRole.achievements[bulletIndex], term);
    if (validateWorkExperienceBullet(patchedBullet)) {
      targetRole.achievements[bulletIndex] = patchedBullet;
    }
  }

  return patchedResume;
}

// ---------------------------------------------------------------------------
// Prompt audit
// ---------------------------------------------------------------------------

function buildPromptAuditText({ stageOneRoleCount, resumePromptText, jobDescriptionTechnicalTerms, targetEngineeringLane }) {
  return [
    `[${RESUME_GENERATION_PROMPT_VERSION}]`,
    `stage1_role_expansions=${stageOneRoleCount}`,
    `target_engineering_lane=${targetEngineeringLane}`,
    `jd_terms=${jobDescriptionTechnicalTerms.join(', ')}`,
    '',
    resumePromptText
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Model caller factory
// ---------------------------------------------------------------------------

function makeCallModelFn(openai) {
  return async function callModelFn(messages, opts = {}) {
    const completion = await openai.chat.completions.create({
      model: RESUME_GENERATION_MODEL,
      temperature: opts.temperature ?? RESUME_GENERATION_TEMPERATURE,
      max_completion_tokens: opts.max_completion_tokens ?? opts.max_tokens ?? 4096,
      response_format: { type: 'json_object' },
      messages
    });

    const rawContent = completion?.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error('Resume generation returned an empty response');

    return JSON.parse(extractJsonFromCompletion(rawContent));
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function generateResume({ profile, jobDescription }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const callModelFn = makeCallModelFn(openai);

  const trimmedJobDescription = buildStrategicJobDescription(jobDescription);
  const jobDescriptionTechnicalTerms = extractJobDescriptionTechnicalTerms(trimmedJobDescription);
  const targetEngineeringLane = inferTargetEngineeringLane(jobDescription);
  const targetCompanyName = extractTargetCompanyName(jobDescription);
  const protectedNames = extractProtectedJobDescriptionNames(jobDescription, targetCompanyName);

  const rawProfileContext = buildResumeProfileContext(profile);
  const stageOneRoleCount = rawProfileContext.work_experiences.filter(
    (role) => !hasRichRoleContent(role)
  ).length;

  const enrichedProfileContext = await expandRoles(
    rawProfileContext,
    targetEngineeringLane,
    jobDescriptionTechnicalTerms,
    callModelFn
  );

  const { messages, promptText, sourceExperiences } = buildResumeGenerationPrompt({
    enrichedProfileContext,
    jobDescription,
    jobDescriptionTechnicalTerms,
    targetCompanyName,
    protectedNames,
    targetEngineeringLane,
    trimmedJobDescription
  });

  const generatedResumeJson = await callModelFn(messages, {
    temperature: RESUME_GENERATION_TEMPERATURE,
    max_completion_tokens: 4096
  });

  const patchedResumeJson = await patchMissingTechTerms(
    normalizeResumeResponse(generatedResumeJson, sourceExperiences),
    jobDescriptionTechnicalTerms,
    enrichedProfileContext
  );

  const qualityRewriteMessages = [
    { role: 'system', content: RESUME_QUALITY_REWRITE_SYSTEM_PROMPT },
    {
      role: 'user',
      content: buildResumeQualityRewritePrompt({
        resumeJson: patchedResumeJson,
        profileContext: enrichedProfileContext,
        jobDescription: trimmedJobDescription
      })
    }
  ];

  const rewrittenResumeJson = await callModelFn(qualityRewriteMessages, {
    temperature: 0.25,
    max_completion_tokens: 4096
  });

  const finalizedResumeJson = normalizeResumeResponse(rewrittenResumeJson, sourceExperiences);

  // Dev-mode guard: warn when the quality-rewrite pass causes bullets to be
  // dropped by normalizeResumeResponse so that validate/filter regressions
  // are caught early without any production overhead.
  if (process.env.NODE_ENV !== 'production') {
    const beforeCount = rewrittenResumeJson?.work_experiences?.reduce(
      (n, r) => n + (r.achievements?.length ?? 0),
      0
    );
    const afterCount = finalizedResumeJson.work_experiences.reduce(
      (n, r) => n + r.achievements.length,
      0
    );
    if (beforeCount !== afterCount) {
      console.warn(
        `[resume] normalizeResumeResponse dropped ${beforeCount - afterCount} bullet(s) after quality rewrite`
      );
    }
  }

  return {
    promptText: buildPromptAuditText({
      stageOneRoleCount,
      resumePromptText: promptText,
      jobDescriptionTechnicalTerms,
      targetEngineeringLane
    }),
    model: RESUME_GENERATION_MODEL,
    promptVersion: RESUME_GENERATION_PROMPT_VERSION,
    response: finalizedResumeJson
  };
}
