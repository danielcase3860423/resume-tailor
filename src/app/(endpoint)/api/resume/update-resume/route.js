export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { sendError } from '@/helpers/endpoint';
import { buildJobDescriptionHash, buildResumeContentHash } from '@/helpers/resume-history';
import dbConnect from '@/mongodb';
import { updateResumeAcrossClusters } from '@/mongodb-resume';
import { syncResumeRegistryMetadata } from '@/services/(endpoint)/resumes/resume-registry.controller';
import { getActiveUserById } from '@/services/(endpoint)/users/user.controller';

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

const SKILL_CATEGORY_UPPERCASE_WORDS = new Set([
  'api',
  'apis',
  'aws',
  'ci/cd',
  'css',
  'c#',
  'c++',
  'db',
  'devops',
  'erp',
  'etl',
  'gcp',
  'html',
  'ios',
  'ml',
  'nlp',
  'qa',
  'rtos',
  'sre',
  'sql',
  'ui',
  'ux'
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

function uniqueStrings(values) {
  const results = [];
  const seen = new Set();

  for (const value of values) {
    const normalized = cleanString(value);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    results.push(normalized);
  }

  return results;
}

function cleanResumeLine(value) {
  let item = cleanString(value)
    .replace(/\s+/g, ' ')
    .replace(/\be\.g\.,?\s*/gi, '')
    .trim();

  const openParenCount = (item.match(/\(/g) || []).length;
  const closeParenCount = (item.match(/\)/g) || []).length;

  if (openParenCount > closeParenCount) {
    item = item.replace(/\([^()]*$/g, '').trim();
  }

  item = item
    .replace(/\)+$/g, '')
    .replace(/^[,;:.-]+|[,;:.-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return item;
}

function normalizeTextList(value, maxItems = Number.POSITIVE_INFINITY) {
  if (Array.isArray(value)) {
    return uniqueStrings(value.map((item) => cleanResumeLine(item)).filter(Boolean)).slice(0, maxItems);
  }

  if (typeof value === 'string') {
    return uniqueStrings(
      value
        .split('\n')
        .map((item) => cleanResumeLine(item.replace(/^[\s*-]+/, '').trim()))
        .filter(Boolean)
    ).slice(0, maxItems);
  }

  return [];
}

function normalizeSkillSource(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeSkillSource(item));
  }

  if (typeof value !== 'string') {
    return [];
  }

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
  if (!/\sand\s/i.test(item)) {
    return [item];
  }

  const parts = item.split(/\s+\band\b\s+/i).map((part) => cleanString(part)).filter(Boolean);
  if (parts.length !== 2) {
    return [item];
  }

  const wordCount = item.split(/\s+/).filter(Boolean).length;
  if (wordCount > 6) {
    return [item];
  }

  const [left, right] = parts;
  const rightWords = right.split(/\s+/).filter(Boolean);

  if (rightWords.length > 1 && left.split(/\s+/).length === 1) {
    const sharedSuffix = rightWords.slice(1).join(' ');
    return [`${left} ${sharedSuffix}`.trim(), right].filter(Boolean);
  }

  return parts;
}

function cleanSkillItem(value) {
  let item = cleanString(value)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\bcheck(?=[A-Z])/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(?:skills?|category|location)\s*:\s*/i, '')
    .replace(/\be\.g\.,?\s*/gi, '')
    .trim();

  const openParenCount = (item.match(/\(/g) || []).length;
  const closeParenCount = (item.match(/\)/g) || []).length;
  if (openParenCount > closeParenCount) {
    item = item.replace(/\([^()]*$/g, '').trim();
  }

  item = item.replace(/\)+$/g, '').replace(/^[,;:.-]+|[,;:.-]+$/g, '').trim();

  return item;
}

function isValidSkillItem(value) {
  const item = cleanString(value);
  if (!item) {
    return false;
  }

  if (NON_SKILL_PATTERNS.some((pattern) => pattern.test(item))) {
    return false;
  }

  return item.split(/\s+/).length <= 6;
}

function normalizeSkillList(value, maxItems = Number.POSITIVE_INFINITY) {
  return uniqueStrings(
    normalizeSkillSource(value)
      .map((item) => cleanSkillItem(item))
      .filter((item) => isValidSkillItem(item))
  ).slice(0, maxItems);
}

function formatSkillCategory(value) {
  const normalized = cleanString(value)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9+#/&.-]+$/g, '')
    .trim();

  if (!normalized) {
    return '';
  }

  return normalized
    .split(' ')
    .map((word) => {
      const lowerWord = word.toLowerCase();
      if (SKILL_CATEGORY_UPPERCASE_WORDS.has(lowerWord)) {
        return word.toUpperCase();
      }

      if (word.includes('&') || word.includes('/') || word.includes('.')) {
        return word;
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function isTechnicalSkillCategory(value) {
  const category = cleanString(value);
  if (!category) {
    return false;
  }

  return !SOFT_SKILL_CATEGORY_PATTERNS.some((pattern) => pattern.test(category));
}

function normalizeTechnicalSkills(technicalSkills) {
  if (!technicalSkills || typeof technicalSkills !== 'object' || Array.isArray(technicalSkills)) {
    return {};
  }

  return Object.entries(technicalSkills).reduce((accumulator, [category, skills]) => {
    const normalizedCategory = formatSkillCategory(category);
    const normalizedSkills = normalizeSkillList(skills, 12);

    if (normalizedCategory && normalizedSkills.length && isTechnicalSkillCategory(normalizedCategory)) {
      accumulator[normalizedCategory] = uniqueStrings([
        ...(accumulator[normalizedCategory] || []),
        ...normalizedSkills
      ]).slice(0, 12);
    }

    return accumulator;
  }, {});
}

function normalizeWorkExperiences(workExperiences) {
  if (!Array.isArray(workExperiences)) {
    return [];
  }

  return workExperiences
    .map((experience) => ({
      job_title: cleanString(experience?.job_title),
      company_name: cleanString(experience?.company_name),
      start_date_employment: cleanString(experience?.start_date_employment),
      end_date_employment: cleanString(experience?.end_date_employment),
      achievements: normalizeTextList(experience?.achievements, 10)
    }))
    .filter(
      (experience) =>
        experience.job_title ||
        experience.company_name ||
        experience.start_date_employment ||
        experience.end_date_employment ||
        experience.achievements.length
    );
}

function normalizeResumeResponse(resumeResponse = {}) {
  return {
    summary: normalizeTextList(resumeResponse.summary, 8),
    technical_skills: normalizeTechnicalSkills(resumeResponse.technical_skills),
    work_experiences: normalizeWorkExperiences(resumeResponse.work_experiences),
    target_company_name: cleanString(resumeResponse.target_company_name),
    target_position: cleanString(resumeResponse.target_position)
  };
}

export const POST = async (req) => {
  try {
    await dbConnect();

    const { resumeId, storageClusterKey, resumeResponse, jobDescription, companyName, jobTitle, userId } = await req.json();

    if (!userId) {
      return sendError(Response, { msg: 'userId is required' });
    }

    await getActiveUserById(userId);

    if (!resumeId) {
      return sendError(Response, { msg: 'resumeId is required' });
    }

    const normalizedResumeResponse = normalizeResumeResponse(resumeResponse);
    const normalizedCompanyName = cleanString(companyName) || normalizedResumeResponse.target_company_name;
    const normalizedJobTitle = cleanString(jobTitle) || normalizedResumeResponse.target_position;

    const updatedResume = await updateResumeAcrossClusters({
      resumeId,
      storageClusterKey,
      updates: {
        companyName: normalizedCompanyName,
        jobTitle: normalizedJobTitle,
        jobDescription: cleanString(jobDescription),
        resumeResponse: normalizedResumeResponse,
        resumeContentHash: buildResumeContentHash(normalizedResumeResponse)
      }
    });

    if (!updatedResume) {
      return sendError(Response, { msg: 'Resume not found', code: 404 });
    }

    await syncResumeRegistryMetadata({
      associatedProfileId: updatedResume.associatedProfileId,
      jobDescriptionHash: updatedResume.jobDescriptionHash || buildJobDescriptionHash(cleanString(jobDescription)),
      companyName: normalizedCompanyName,
      jobTitle: normalizedJobTitle,
      resumeId: String(updatedResume._id),
      storageClusterKey: updatedResume.storageClusterKey || storageClusterKey || ''
    });

    return Response.json({
      result: 'success',
      resume: updatedResume
    });
  } catch (error) {
    console.log(error);
    return sendError(Response, { msg: error?.message || 'Unknown error' });
  }
};
