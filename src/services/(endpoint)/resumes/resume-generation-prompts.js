// Model & prompt versioning
export const RESUME_GENERATION_MODEL = 'gpt-4.1-nano';
export const RESUME_GENERATION_TEMPERATURE = 0.7;
export const RESUME_GENERATION_PROMPT_VERSION = 'resume-v25';

// Constants
const MAX_JOB_DESCRIPTION_LENGTH = 12000;
const MAX_JOB_DESCRIPTION_TERMS = 50;
const KEYWORD_PHRASE_WORD_LIMIT = 5;
const MAX_JOB_DESCRIPTION_HEADER_LENGTH = 1200;
const ROLE_EXPANSION_JD_TERM_PREVIEW_LIMIT = 25;

// Tech term extraction patterns
const TECH_TERM_PATTERNS = [
  /(?:^|[^A-Za-z0-9])(Azure Databricks|Microsoft Azure|Azure Data Factory|Azure Synapse|AWS Lambda|AWS CloudWatch|Amazon CloudWatch|Amazon DynamoDB|Amazon RDS|Amazon S3|Amazon EC2|AWS CDK|AWS CloudFormation|GitHub Actions|GitLab CI|Ruby on Rails|Spring Boot|Tailwind CSS|React Native|React\.js|Vue\.js|AngularJS|ASP\.NET MVC|ASP\.NET|\.NET Core|\.NET Framework|Infrastructure as Code|Unity Catalog|Windows Server|Power BI|Next\.js|Node\.js)(?=$|[^A-Za-z0-9])/gi,
  /(?:^|[^A-Za-z0-9])(AI|ML|NLP|LLM|Llama|LangChain|MLOps|PyTorch|Pytorch|TensorFlow|Tensorflow|RAG|SQL|NoSQL|ETL|ELT|API|SDK|CI\/CD|TDD|BDD|SaaS|PaaS|IaaS|AWS|Azure|GCP|Agile|Scrum|Kanban|DevOps|SRE|QA|UI|UX|RDBMS|REST|GraphQL|OAuth|SSO|JWT|IAM|SLA|SDLC|MVC|HIPAA|HIPPA|SOC2|SOC 2|GDPR|FH7|Microservices|Kubernetes|Docker|Terraform|Ansible|Jenkins|ArgoCD|Helm|Kafka|Redis|PostgreSQL|Postgres|MySQL|MongoDB|DynamoDB|CloudWatch|Cloudflare|Snowflake|Databricks|PySpark|BigQuery|Redshift|React|TypeScript|JavaScript|Python|Java|C\+\+|C#|C Sharp|\.NET|Go|Golang|Rails|PHP|Laravel|Django|Flask|FastAPI|Vue(?:\.js)?|Angular|Svelte|Bootstrap|HTML5|HTML|CSS3|CSS|Sass|Less|Webpack|Vite|Babel|Jest|Cypress|Playwright|Selenium|PyTest|JUnit|Pandas|NumPy|Spark|Hadoop|Airflow|dbt|Tableau|Looker|Linux|Unix|Bash|Serverless|Lambda|EC2|S3|RDS|CloudFormation|Prometheus|Grafana|Datadog|Splunk|OpenTelemetry|iOS|Android)(?=$|[^A-Za-z0-9])/gi
];

// Keyword filtering
const GENERIC_KEYWORD_PREFIXES = new Set([
  'experience with',
  'proficiency in',
  'proficient in',
  'expertise in',
  'knowledge of',
  'familiarity with',
  'hands-on experience with',
  'strong understanding of',
  'understanding of',
  'working knowledge of',
  'background in'
]);

const KEYWORD_STOPWORDS = new Set([
  'and', 'or', 'the', 'a', 'an', 'with', 'using', 'use', 'for', 'to', 'of',
  'in', 'on', 'by', 'through', 'across', 'plus', 'including', 'required',
  'preferred', 'ability', 'skills', 'skill', 'experience', 'years', 'year',
  'team', 'tools', 'tool', 'technology', 'technologies', 'environment',
  'platform', 'platforms'
]);

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

// Kept lean: only rules the model must apply at the generation stage.
// Verification obligations live in the user prompt where they are actionable.
const RESUME_SYSTEM_PROMPT = `
You are an expert ATS resume strategist and CV tailoring assistant.

Core rules:
- Return valid JSON only. No markdown, commentary, or code fences.
- Do not fabricate employers, titles, dates, degrees, certifications, tools, metrics, or outcomes.
- Write in polished, human, credible prose. No robotic phrasing or keyword stuffing.
- Mirror job-description terminology only when it honestly fits the candidate background.
- Use exact technical terms from the job description when supported; never replace them with vaguer synonyms.
- Never paste raw job-description fragments, recruiter copy, benefits text, compensation text, remote-location labels, or "for more information" style boilerplate into resume bullets.
- Never claim the candidate worked at the target employer or used the target employer's internal products/teams unless those names already appear in the candidate source data.
- technical_skills category labels must be short readable nouns (e.g. Languages, Cloud Services). No underscores, snake_case, or camelCase.
- technical_skills entries must be concise skill names only — no sentences, benefits, or policy text.
- Split combined skill phrases into separate items rather than joining with "and".
- Do not create soft-skill categories (Leadership, Communication, etc.).
- Output only the fields defined in the output schema. Do not include "sample_achievements",
  "inferred_responsibilities", "confidence_flags", or any role-expansion fields.
`.trim();

// Base generation requirements
const RESUME_REQUIREMENTS_BASE = [
  'Extract target_company_name and target_position from the job description.',
  'Write a summary array of 6–8 concise lines aligned to the target role.',
  'Order summary, work experience bullets, and skills by relevance to this job.',
  'Keep one work_experiences entry per provided role; preserve candidate chronology.',
  'Write 6–8 achievement bullets per role, ordered by relevance to the target job.',
  'Preserve company name, job title, and employment dates exactly as provided.',
  'Each bullet must start with a strong action verb and stay under 38 words when possible.',
  'Use present tense for current roles; past tense for past roles.',
  'Express impact through scope, ownership, and domain when exact metrics are unknown. Never invent numbers.',
  'Adjust emphasis to the detected target engineering lane across summary, bullets, and skills.',
  'Convert any protected target-side branded names into generic domain phrases (e.g. "insurance underwriting platform") in past experience bullets.',
  'Do not copy job-description prose fragments into bullets. Rewrite them into clean, natural resume language instead of pasting half-sentences or banner text.',
  'technical_skills must contain 4–6 categories, each with 6–8 relevant skills.',
  'Use hard-skill categories only: Programming Languages, Backend, Frontend, Cloud Services, Databases, DevOps, Testing, Architecture, etc.',
  'De-emphasize details not relevant to this role while preserving truth and integrity.',
  'Do not leave dangling parentheses, broken fragments, or unfinished clauses anywhere in the output.'
];

// Output schema
const RESUME_OUTPUT_SCHEMA = `{
  "work_experiences": [
    {
      "job_title": "",
      "company_name": "",
      "start_date_employment": "",
      "end_date_employment": "",
      "achievements": ["", ""]
    }
  ],
  "summary": ["", ""],
  "technical_skills": {
    "Category": ["", ""]
  },
  "target_position": ""
}`;

// ---------------------------------------------------------------------------
// String utilities
// ---------------------------------------------------------------------------

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function truncateText(value, maxLength) {
  const text = cleanString(value);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function normalizeJobDescriptionText(value) {
  return cleanString(value)
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

function splitJobDescriptionSections(jobDescription) {
  return normalizeJobDescriptionText(jobDescription)
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function scoreJobDescriptionSection(section, index) {
  const text = section.toLowerCase();
  let score = 0;
  if (index === 0) score += 10;
  if (/\b(responsibilit(?:y|ies)|what you'll do|what you will do|duties|role overview|position overview|summary|about the role)\b/.test(text))
    score += 120;
  if (
    /\b(required|requirements|required skillset|required skills|must have|qualifications|education\/experience|education and experience|knowledge, skills and abilities|knowledge skills and abilities|preferred qualifications|what do we need)\b/.test(text)
  )
    score += 150;
  if (
    /\b(node\.js|javascript|typescript|react|aws|postgres|postgresql|dynamodb|docker|github actions|aws cdk|ci\/cd|html|css|npm|linux|unix|windows|serverless|agile|scrum|safe|spark|hadoop|airflow|dbt|kafka|databricks|snowflake|bigquery|redshift|machine learning|ml|ai|llm|nlp|tensorflow|pytorch|kubeflow|mlops|terraform|ansible|jenkins|argocd|helm|prometheus|grafana|iot|mqtt|embedded|firmware|rtos|c\+\+|c)\b/.test(text)
  )
    score += 70;
  if (
    /\b(full software development lifecycle|sdlc|design|development|unit testing|architecture|api|frontend|back-end|backend|cloud|data pipeline|etl|elt|orchestration|warehouse|model serving|inference|observability|reliability|telemetry|edge|firmware|device)\b/.test(text)
  )
    score += 45;
  if (/\b(work environment|home office|travel|salary range|benefits|equal opportunity|corporate site|view all jobs)\b/.test(text))
    score -= 40;
  if (/\b(global market leader|our mission|customer-centric|team players|high achievers)\b/.test(text)) score -= 25;
  return score;
}

// ---------------------------------------------------------------------------
// Job description builders
// ---------------------------------------------------------------------------

export function buildStrategicJobDescription(jobDescription, maxLength = MAX_JOB_DESCRIPTION_LENGTH) {
  const normalized = normalizeJobDescriptionText(jobDescription);
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;

  const sections = splitJobDescriptionSections(normalized);
  if (!sections.length) return truncateText(normalized, maxLength);

  const selected = [];
  const seen = new Set();
  let remaining = maxLength;

  const header = truncateText(sections[0], Math.min(MAX_JOB_DESCRIPTION_HEADER_LENGTH, remaining));
  if (header) {
    selected.push(header);
    seen.add(0);
    remaining -= header.length;
  }

  const ranked = sections
    .map((section, index) => ({ section, index, score: scoreJobDescriptionSection(section, index) }))
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.index - b.index));

  for (const { section, index } of ranked) {
    if (remaining <= 0 || seen.has(index)) continue;
    const available = remaining - (selected.length ? 2 : 0);
    if (available <= 0) break;
    const excerpt = truncateText(section, available);
    if (!excerpt) continue;
    selected.push(excerpt);
    seen.add(index);
    remaining -= excerpt.length + (selected.length > 1 ? 2 : 0);
  }

  return selected.join('\n\n').trim();
}

export function inferTargetEngineeringLane(jobDescription) {
  const text = normalizeJobDescriptionText(jobDescription).toLowerCase();

  if (/\b(embedded|firmware|rtos|bare metal|device driver|microcontroller|uart|spi|i2c|hardware bring-up|board support package|bsp)\b/.test(text))
    return 'embedded engineer';
  if (/\b(iot|internet of things|telemetry|edge device|sensor|mqtt|device connectivity|industrial protocol)\b/.test(text))
    return 'iot engineer';
  if (/\b(ai\/ml|machine learning|ml engineer|deep learning|llm|nlp|computer vision|model training|model serving|mlops|rag)\b/.test(text))
    return 'ai/ml engineer';
  if (/\b(data engineer|etl|elt|data pipeline|data platform|data warehouse|spark|airflow|dbt|databricks|snowflake|bigquery|redshift|streaming)\b/.test(text))
    return 'data engineer';
  if (/\b(devops|site reliability|sre|platform engineer|infrastructure|terraform|ansible|kubernetes|helm|argocd|observability|prometheus|grafana|ci\/cd)\b/.test(text))
    return 'devops engineer';
  // Detect full-stack before falling through to the generic label so JDs that
  // name both React and Node.js don't get treated as plain software engineering.
  if (/\b(full[- ]?stack|fullstack|react|next\.js|node\.js|typescript|frontend|back[- ]?end)\b/.test(text))
    return 'full-stack engineer';

  return 'software engineer';
}

// ---------------------------------------------------------------------------
// Keyword extraction
// ---------------------------------------------------------------------------

function normalizeKeywordTerm(value) {
  return cleanString(value)
    .replace(/^[^A-Za-z0-9.+#/()-]+|[^A-Za-z0-9.+#/()-]+$/g, '')
    .replace(/\s+/g, ' ');
}

function uniqueTerms(values, maxItems = Number.POSITIVE_INFINITY) {
  const results = [];
  const seen = new Set();
  for (const value of values) {
    const normalized = normalizeKeywordTerm(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(normalized);
    if (results.length >= maxItems) break;
  }
  return results;
}

/**
 * Collapse variant spellings of the same technology into a canonical form so
 * that "React" and "React.js" don't both end up in the extracted term list.
 * Add new entries here as new aliases are observed in the wild.
 */
function normalizeExtractedTerm(term) {
  const t = term.trim();
  const aliases = {
    'React.js': 'React',
    'ReactJS':  'React',
    'Vue.js':   'Vue',
    'VueJS':    'Vue',
    'Node.js':  'Node.js', // canonical — keep as-is
    'NodeJS':   'Node.js',
    'Pytorch':  'PyTorch',
    'Tensorflow': 'TensorFlow',
    'Postgres': 'PostgreSQL',
  };
  return aliases[t] ?? t;
}

function extractPatternTerms(jobDescription) {
  const results = [];
  for (const pattern of TECH_TERM_PATTERNS) {
    for (const match of jobDescription.match(pattern) || []) {
      results.push(normalizeExtractedTerm(match.trim()));
    }
  }
  return results;
}

function stripGenericKeywordPrefix(value) {
  const lowered = value.toLowerCase();
  for (const prefix of GENERIC_KEYWORD_PREFIXES) {
    if (lowered.startsWith(`${prefix} `)) return value.slice(prefix.length + 1);
  }
  return value;
}

function looksTechnicalPhrase(value) {
  if (!value) return false;
  const words = value.split(/\s+/).filter(Boolean);
  if (!words.length || words.length > KEYWORD_PHRASE_WORD_LIMIT) return false;
  if (words.every((w) => KEYWORD_STOPWORDS.has(w.toLowerCase()))) return false;
  return words.some((w) => {
    if (KEYWORD_STOPWORDS.has(w.toLowerCase())) return false;
    return (
      /[A-Z]{2,}/.test(w) ||
      /[./#+-]/.test(w) ||
      /^\d/.test(w) ||
      /(js|sql|api|sdk|cloud|ops|test|testing|data|services?|architecture|engineering|automation|frontend|backend|full[- ]?stack|security|analytics|mobile|web|devops)$/i.test(w)
    );
  });
}

function extractKeywordPhrases(jobDescription) {
  return jobDescription
    .split(/\n|[;,]/)
    .map((s) => stripGenericKeywordPrefix(s))
    .map((s) => s.replace(/\([^)]*\)/g, ' '))
    .map((s) => s.replace(/\b(?:must have|nice to have|preferred qualifications?|requirements?)\b/gi, ' '))
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(looksTechnicalPhrase);
}

export function extractTargetCompanyName(jobDescription) {
  const text = normalizeJobDescriptionText(jobDescription);
  if (!text) return '';
  const companyLine = text.match(/(?:^|\n)\s*Company:\s*([^\n]+)/i);
  if (companyLine?.[1]) return normalizeKeywordTerm(companyLine[1]);
  const companyIntro = text.match(/(?:^|\n)\s*([A-Z][A-Za-z0-9&.,' -]{1,80}?)\s+(?:is|provides|builds|develops)\b/);
  if (companyIntro?.[1]) return normalizeKeywordTerm(companyIntro[1]);
  return '';
}

export function extractProtectedJobDescriptionNames(jobDescription, targetCompanyName = '') {
  const text = normalizeJobDescriptionText(jobDescription);
  if (!text) return [];

  const protectedNames = [];
  const brandedPattern =
    /\b([A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*)*(?:\s+(?:and|of|for|&)\s+[A-Z][A-Za-z0-9&.-]*)*\s+(?:solution|platform|product|team|initiative|framework|system))\b/g;
  for (const match of text.matchAll(brandedPattern)) protectedNames.push(match[1]);

  if (targetCompanyName) {
    protectedNames.push(targetCompanyName);
    const token = targetCompanyName.split(/\s+/)[0];
    if (token && token.length >= 4) {
      const companyScopedPattern = new RegExp(
        `\\b(${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+[A-Z][A-Za-z0-9&.-]*(?:\\s+[A-Z][A-Za-z0-9&.-]*)*(?:\\s+(?:solution|platform|product|team|initiative|framework|system)))\\b`,
        'g'
      );
      for (const match of text.matchAll(companyScopedPattern)) protectedNames.push(match[1]);
    }
  }

  return uniqueTerms(protectedNames, 20);
}

export function extractJobDescriptionTechnicalTerms(jobDescription) {
  const text = buildStrategicJobDescription(jobDescription, MAX_JOB_DESCRIPTION_LENGTH);
  if (!text) return [];
  return uniqueTerms([...extractPatternTerms(text), ...extractKeywordPhrases(text)], MAX_JOB_DESCRIPTION_TERMS);
}

// ---------------------------------------------------------------------------
// Profile context builder
// ---------------------------------------------------------------------------

export function buildResumeProfileContext(profile = {}) {
  const workExperiences = Array.isArray(profile?.profileWorkExperience)
    ? profile.profileWorkExperience.map((e) => ({
        job_title: cleanString(e?.jobTitle),
        employer: cleanString(e?.employer),
        start_date: cleanString(e?.startDate),
        end_date: cleanString(e?.endDate),
        employee_type: cleanString(e?.employeeType),
        location: cleanString(e?.location)
      }))
    : [];

  const education = Array.isArray(profile?.profileEducation)
    ? profile.profileEducation.map((e) => ({
        education_level: cleanString(e?.educationLevel),
        field_of_study: cleanString(e?.fieldOfStudy),
        start_date: cleanString(e?.startDate),
        year_of_completion: cleanString(e?.yearOfCompletion),
        institution: cleanString(e?.institution),
        final_evaluation_grade: cleanString(e?.finalEvaluationGrade)
      }))
    : [];

  return {
    profile_name: cleanString(profile?.profileName),
    profile_title: cleanString(profile?.profileTitle),
    work_experiences: workExperiences,
    education
  };
}

// ---------------------------------------------------------------------------
// Role expansion prompt
// ---------------------------------------------------------------------------

function deriveTenureLabel(startDate, endDate) {
  if (!startDate) return 'unknown duration';
  const normalizedEndDate = endDate && endDate.toLowerCase() !== 'present' ? endDate : 'present';
  return `${startDate} - ${normalizedEndDate}`;
}

function classifyRoleRecency(role) {
  const normalizedEndDate = cleanString(role?.end_date).toLowerCase();
  const title = cleanString(role?.job_title).toLowerCase();

  if (normalizedEndDate === 'present' || normalizedEndDate === 'current') return 'current';
  if (/\b(staff|principal|lead|manager|architect|head|director)\b/.test(title)) return 'senior-recent';
  return 'historical';
}

export function buildRoleExpansionPrompt(role, targetEngineeringLane, jdKeyTerms) {
  const tenure = deriveTenureLabel(role.start_date, role.end_date);
  // Use the increased preview limit so platform/AI JDs expose their most
  // distinctive named tools to the expansion model.
  const keyTermPreview = jdKeyTerms.slice(0, ROLE_EXPANSION_JD_TERM_PREVIEW_LIMIT).join(', ');
  const roleRecency = classifyRoleRecency(role);

  return `
Expand this role into rich context for a resume writer.

Role:
- Title: ${role.job_title || 'Software Engineer'}
- Employer: ${role.employer || 'a technology company'}
- Tenure: ${tenure}
- Employee type: ${role.employee_type || 'full-time'}
- Recency / specificity mode: ${roleRecency}

Target engineering lane:
${targetEngineeringLane}

Some technologies from the target job description:
${keyTermPreview || 'None'}

Specific guidance:
- If this role is marked "current" or "senior-recent", prefer exact named technologies
  from the target job description when they plausibly fit the title and engineering lane.
- If this role is marked "historical", keep the stack believable for the period and avoid
  stuffing in modern named tools unless they are a very natural fit.
- For AI/ML, data, cloud, or platform-oriented lanes, it is acceptable to name concrete
  tools such as LangChain, AWS Lambda, Azure Databricks, Kubernetes, or GitHub Actions
  when they plausibly fit this role.
- Use 4-8 specific tools in likely_tech_stack when justified, not generic labels only.

Return a JSON object with:
{
  "inferred_responsibilities": "2-3 sentence paragraph of what this person likely owned and built",
  "likely_tech_stack": ["specific tool or platform"],
  "delivery_practices": ["CI/CD with GitHub Actions", "Agile / Scrum ceremonies"],
  "seniority_signals": "one sentence describing scope and seniority",
  "ats_keywords": ["short ATS-friendly terms tied to this role"],
  "scope_of_impact": "individual | team | org | cross-org",
  "confidence_flags": {
    "tech_stack": "high | medium | low",
    "responsibilities": "high | medium | low",
    "seniority": "high | medium | low"
  }
}
`.trim();
}

// ---------------------------------------------------------------------------
// Primary prompt builder
// ---------------------------------------------------------------------------

export function buildResumeGenerationPrompt({
  profile,
  enrichedProfileContext,
  jobDescription,
  jobDescriptionTechnicalTerms,
  targetCompanyName,
  protectedNames,
  targetEngineeringLane,
  trimmedJobDescription
}) {
  const profileContext = enrichedProfileContext || buildResumeProfileContext(profile);
  const strategicJobDescription = trimmedJobDescription || buildStrategicJobDescription(jobDescription, MAX_JOB_DESCRIPTION_LENGTH);
  const extractedTechnicalTerms = jobDescriptionTechnicalTerms || extractJobDescriptionTechnicalTerms(strategicJobDescription);
  const extractedTargetCompanyName = targetCompanyName || extractTargetCompanyName(jobDescription);
  const extractedProtectedNames = protectedNames || extractProtectedJobDescriptionNames(jobDescription, extractedTargetCompanyName);
  const inferredEngineeringLane = targetEngineeringLane || inferTargetEngineeringLane(jobDescription);
  const sourceEmployerNames = uniqueTerms(profileContext.work_experiences.map((e) => e.employer), 20);
  const baseRequirementLines = RESUME_REQUIREMENTS_BASE.map((item, i) => `${i + 1}. ${item}`).join('\n');
  const priorityTerms = extractedTechnicalTerms.length ? extractedTechnicalTerms.join(', ') : 'None';

  const userPrompt = `
Create tailored resume content for the candidate below.

═══════════════════════════════════════════════
WORKFLOW
═══════════════════════════════════════════════
Use the candidate's REAL profile experience as the source of truth.
Tailor the resume directly from that experience and the job description.
Do NOT invent an intermediate career story, fake projects, or fake employer-specific work.

═══════════════════════════════════════════════
PART A — GENERAL REQUIREMENTS
═══════════════════════════════════════════════
${baseRequirementLines}

═══════════════════════════════════════════════
PART B — JD TERM PRIORITIES
═══════════════════════════════════════════════
Priority technical terms from the job description:
${priorityTerms}

How to use them:
1. Include as many relevant technical terms as plausibly fit the candidate background.
2. Prioritize the most recent and most relevant roles first.
3. Spread terms naturally across summary, work_experiences, and technical_skills.
4. Do NOT force every term into work_experiences if it makes the bullet awkward or unrealistic.
5. Prefer omission over broken phrasing, pasted JD fragments, or fake tool usage.
6. For multi-word named technologies such as "AWS Lambda", "Azure Databricks", "GitHub Actions", or "LangChain", keep the exact spelling when you use them.

═══════════════════════════════════════════════
PART C — OUTPUT SCHEMA
═══════════════════════════════════════════════
${RESUME_OUTPUT_SCHEMA}

═══════════════════════════════════════════════
PART D — CANDIDATE DATA
═══════════════════════════════════════════════
Candidate profile:
${JSON.stringify(profileContext, null, 2)}

Allowed source employers (past experience only):
${JSON.stringify(sourceEmployerNames, null, 2)}

Protected target-side names (must NOT appear in past experience):
${JSON.stringify(extractedProtectedNames, null, 2)}

Target engineering lane: ${inferredEngineeringLane}

═══════════════════════════════════════════════
PART E — HALLUCINATION CHECK (run before output)
═══════════════════════════════════════════════
1. Every company_name in work_experiences must match the candidate source employer for that role.
2. No achievement or summary line may state or imply prior work at the target employer unless that employer already appears in the candidate source data.
3. No achievement or summary line may include a protected target-side name unless it already appears in the candidate source data.
4. Replace any protected target-side branded name with a generic domain phrase (e.g. "loan origination platform", "enterprise data warehouse").
5. Re-read every work_experiences bullet before outputting. If a bullet feels pasted, repetitive, stitched together, or overloaded with comma-separated tools, rewrite it into a clean, believable sentence.
6. Never append terms mechanically with repeated "with X, with Y" phrasing.

═══════════════════════════════════════════════
PART F — TARGET JOB DESCRIPTION
═══════════════════════════════════════════════
${strategicJobDescription}
  `.trim();

  return {
    messages: [
      { role: 'system', content: RESUME_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    promptText: `SYSTEM:\n${RESUME_SYSTEM_PROMPT}\n\nUSER:\n${userPrompt}`,
    sourceExperiences: profileContext.work_experiences,
    jobDescriptionTechnicalTerms: extractedTechnicalTerms
  };
}
