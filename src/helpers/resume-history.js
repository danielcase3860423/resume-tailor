import crypto from 'crypto';

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

export function stableStringify(value) {
  return JSON.stringify(sortObjectKeys(value ?? {}));
}

export function normalizeResumeText(value) {
  return (value || '')
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeJobDescriptionForSimilarity(value) {
  return normalizeResumeText(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeJobDescriptionSimilarity(leftValue, rightValue) {
  const leftTokens = normalizeJobDescriptionForSimilarity(leftValue).split(' ').filter(Boolean);
  const rightTokens = normalizeJobDescriptionForSimilarity(rightValue).split(' ').filter(Boolean);

  if (!leftTokens.length || !rightTokens.length) {
    return 0;
  }

  if (leftTokens.join(' ') === rightTokens.join(' ')) {
    return 1;
  }

  const buildBigrams = (tokens) => {
    if (tokens.length === 1) {
      return [tokens[0]];
    }

    const bigrams = [];
    for (let index = 0; index < tokens.length - 1; index += 1) {
      bigrams.push(`${tokens[index]} ${tokens[index + 1]}`);
    }

    return bigrams;
  };

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

export function buildResumeContentHash(resumeResponse) {
  return crypto.createHash('sha256').update(stableStringify(resumeResponse || {})).digest('hex');
}

export function buildJobDescriptionHash(jobDescription) {
  return crypto.createHash('sha256').update(normalizeResumeText(jobDescription)).digest('hex');
}
