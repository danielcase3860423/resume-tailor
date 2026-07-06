import dbConnect from '@/mongodb';
import companyBlacklistModel from '@/models/companyBlacklist.model';
import { extractTargetCompanyName } from '@/services/(endpoint)/resumes/resume-generation-prompts';

export function normalizeCompanyName(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBulkCompanyNames(value = '') {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function resolveTargetCompanyName({ companyName = '', jobDescription = '', url = '' }) {
  const explicitName = String(companyName || '').trim();
  if (explicitName) {
    return explicitName;
  }

  const extractedName = extractTargetCompanyName(jobDescription);
  if (extractedName) {
    return extractedName;
  }

  try {
    const hostname = new URL(String(url || '').trim()).hostname.replace(/^www\./, '');
    const domainRoot = hostname.split('.').filter(Boolean)[0] || '';
    if (domainRoot && !['linkedin', 'indeed', 'glassdoor', 'ziprecruiter', 'monster'].includes(domainRoot)) {
      return domainRoot;
    }
  } catch {
    // Ignore invalid URLs.
  }

  return '';
}

export function isBlacklistedCompanyMatch(candidateName, blacklistedName) {
  const candidate = normalizeCompanyName(candidateName);
  const blocked = normalizeCompanyName(blacklistedName);

  if (!candidate || !blocked) {
    return false;
  }

  if (candidate === blocked) {
    return true;
  }

  const candidateTokens = new Set(candidate.split(' ').filter(Boolean));
  const blockedTokens = blocked.split(' ').filter(Boolean);

  return blockedTokens.length > 0 && blockedTokens.every((token) => candidateTokens.has(token));
}

export async function getBlacklistedCompanies() {
  await dbConnect();
  return companyBlacklistModel.find({}).sort({ companyName: 1 }).lean();
}

export async function createBlacklistedCompany({ companyName, createdByUserId = '' }) {
  await dbConnect();

  const cleanedCompanyName = String(companyName || '').trim();
  const normalizedName = normalizeCompanyName(cleanedCompanyName);

  if (!cleanedCompanyName || !normalizedName) {
    throw new Error('Company name is required');
  }

  const existing = await companyBlacklistModel.findOne({ normalizedName }).lean();
  if (existing) {
    throw new Error('This company is already blacklisted');
  }

  const created = await companyBlacklistModel.create({
    companyName: cleanedCompanyName,
    normalizedName,
    createdByUserId: String(createdByUserId || '')
  });

  return created.toObject();
}

export async function createBlacklistedCompaniesBulk({ bulkValue, createdByUserId = '' }) {
  const parsedNames = parseBulkCompanyNames(bulkValue);
  if (!parsedNames.length) {
    throw new Error('Please enter at least one company name.');
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const companyName of parsedNames) {
    try {
      await createBlacklistedCompany({ companyName, createdByUserId });
      createdCount += 1;
    } catch (error) {
      if (error?.message === 'This company is already blacklisted') {
        skippedCount += 1;
        continue;
      }
      throw error;
    }
  }

  return { createdCount, skippedCount };
}

export async function updateBlacklistedCompany(id, { companyName }) {
  await dbConnect();

  const cleanedCompanyName = String(companyName || '').trim();
  const normalizedName = normalizeCompanyName(cleanedCompanyName);

  if (!cleanedCompanyName || !normalizedName) {
    throw new Error('Company name is required');
  }

  const existing = await companyBlacklistModel.findById(id).lean();
  if (!existing) {
    throw new Error('Blacklisted company not found');
  }

  const duplicate = await companyBlacklistModel.findOne({
    normalizedName,
    _id: { $ne: id }
  }).lean();

  if (duplicate) {
    throw new Error('This company is already blacklisted');
  }

  return companyBlacklistModel
    .findByIdAndUpdate(id, { companyName: cleanedCompanyName, normalizedName }, { new: true })
    .lean();
}

export async function deleteBlacklistedCompany(id) {
  await dbConnect();
  return companyBlacklistModel.findByIdAndDelete(id).lean();
}

export async function findBlacklistedCompanyMatch({ companyName = '', jobDescription = '', url = '' }) {
  await dbConnect();

  const targetCompanyName = resolveTargetCompanyName({ companyName, jobDescription, url });
  if (!targetCompanyName) {
    return null;
  }

  const blacklist = await companyBlacklistModel.find({}, { companyName: 1, normalizedName: 1 }).lean();
  if (!blacklist.length) {
    return null;
  }

  return (
    blacklist.find((entry) =>
      isBlacklistedCompanyMatch(targetCompanyName, entry.normalizedName || entry.companyName)
    ) || null
  );
}
