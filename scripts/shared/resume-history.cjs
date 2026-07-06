const crypto = require('crypto');

const BOILERPLATE_LINE_PATTERN =
  /\b(work environment|home office|travel|salary range|benefits|equal opportunity|eeo|affirmative action|corporate site|view all jobs|posted \d+ days ago|apply now|click here to apply|about the company|company overview)\b/i;

function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = sortObjectKeys(value[key]);
        return accumulator;
      }, {});
  }

  return value;
}

function stableStringify(value) {
  return JSON.stringify(sortObjectKeys(value ?? {}));
}

function normalizeResumeText(value) {
  return (value || '')
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function stripJobDescriptionBoilerplate(value) {
  return (value || '')
    .toString()
    .split(/\n/)
    .filter((line) => !BOILERPLATE_LINE_PATTERN.test(line))
    .join('\n');
}

function canonicalizeJobDescription(value) {
  return normalizeResumeText(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeJobDescriptionForSimilarity(value) {
  return canonicalizeJobDescription(stripJobDescriptionBoilerplate(value));
}

function tokenizeForSimilarity(value) {
  return normalizeJobDescriptionForSimilarity(value).split(' ').filter(Boolean);
}

function buildBigrams(tokens) {
  if (tokens.length === 1) {
    return [tokens[0]];
  }

  const bigrams = [];
  for (let index = 0; index < tokens.length - 1; index += 1) {
    bigrams.push(`${tokens[index]} ${tokens[index + 1]}`);
  }

  return bigrams;
}

function computeBigramDiceSimilarity(leftTokens, rightTokens) {
  const leftBigrams = buildBigrams(leftTokens);
  const rightBigrams = buildBigrams(rightTokens);
  const rightCounts = rightBigrams.reduce((accumulator, gram) => {
    accumulator.set(gram, (accumulator.get(gram) || 0) + 1);
    return accumulator;
  }, new Map());

  let overlap = 0;
  for (const gram of leftBigrams) {
    const count = rightCounts.get(gram) || 0;
    if (count > 0) {
      overlap += 1;
      rightCounts.set(gram, count - 1);
    }
  }

  return (2 * overlap) / (leftBigrams.length + rightBigrams.length);
}

function computeTokenJaccardSimilarity(leftTokens, rightTokens) {
  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);

  if (!leftSet.size || !rightSet.size) {
    return 0;
  }

  let intersection = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersection += 1;
    }
  }

  const union = leftSet.size + rightSet.size - intersection;
  return union ? intersection / union : 0;
}

function computeTokenContainmentSimilarity(leftTokens, rightTokens) {
  const [smallerTokens, largerTokens] =
    leftTokens.length <= rightTokens.length ? [leftTokens, rightTokens] : [rightTokens, leftTokens];
  const smallerSet = new Set(smallerTokens);
  const largerSet = new Set(largerTokens);

  if (!smallerSet.size) {
    return 0;
  }

  let contained = 0;
  for (const token of smallerSet) {
    if (largerSet.has(token)) {
      contained += 1;
    }
  }

  return contained / smallerSet.size;
}

function computeJobDescriptionSimilarity(leftValue, rightValue) {
  const leftTokens = tokenizeForSimilarity(leftValue);
  const rightTokens = tokenizeForSimilarity(rightValue);

  if (!leftTokens.length || !rightTokens.length) {
    return 0;
  }

  if (leftTokens.join(' ') === rightTokens.join(' ')) {
    return 1;
  }

  const bigramScore = computeBigramDiceSimilarity(leftTokens, rightTokens);
  const jaccardScore = computeTokenJaccardSimilarity(leftTokens, rightTokens);
  const containmentScore = computeTokenContainmentSimilarity(leftTokens, rightTokens);
  const containmentBoost = containmentScore >= 0.9 ? containmentScore : 0;

  return Math.max(bigramScore, jaccardScore, containmentBoost);
}

function buildResumeContentHash(resumeResponse) {
  return crypto.createHash('sha256').update(stableStringify(resumeResponse || {})).digest('hex');
}

function buildJobDescriptionHash(jobDescription) {
  return crypto.createHash('sha256').update(normalizeJobDescriptionForSimilarity(jobDescription)).digest('hex');
}

module.exports = {
  buildJobDescriptionHash,
  buildResumeContentHash,
  computeJobDescriptionSimilarity,
  stableStringify
};
