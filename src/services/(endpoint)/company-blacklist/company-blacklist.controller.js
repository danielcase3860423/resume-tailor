import dbConnect from '@/mongodb';
import companyBlacklistModel from '@/models/companyBlacklist.model';

export function normalizeCompanyName(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildNormalizedSearchText({ companyName = '', jobDescription = '', url = '' }) {
  return normalizeCompanyName([companyName, jobDescription, url].filter(Boolean).join(' '));
}

function parseBulkCompanyNames(value = '') {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
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
  await dbConnect();

  const parsedNames = parseBulkCompanyNames(bulkValue);
  if (!parsedNames.length) {
    throw new Error('Please enter at least one company name.');
  }

  const normalizedMap = new Map();
  for (const companyName of parsedNames) {
    const normalizedName = normalizeCompanyName(companyName);
    if (!normalizedName) {
      continue;
    }

    if (!normalizedMap.has(normalizedName)) {
      normalizedMap.set(normalizedName, companyName);
    }
  }

  const normalizedNames = [...normalizedMap.keys()];
  if (!normalizedNames.length) {
    throw new Error('Please enter at least one valid company name.');
  }

  const existingCompanies = await companyBlacklistModel.find(
    { normalizedName: { $in: normalizedNames } },
    { normalizedName: 1 }
  ).lean();
  const existingNormalizedNames = new Set(existingCompanies.map((item) => item.normalizedName));

  const docsToInsert = normalizedNames
    .filter((normalizedName) => !existingNormalizedNames.has(normalizedName))
    .map((normalizedName) => ({
      companyName: normalizedMap.get(normalizedName),
      normalizedName,
      createdByUserId: String(createdByUserId || '')
    }));

  if (!docsToInsert.length) {
    return { createdCount: 0, skippedCount: normalizedNames.length };
  }

  await companyBlacklistModel.insertMany(docsToInsert, { ordered: false });

  return {
    createdCount: docsToInsert.length,
    skippedCount: normalizedNames.length - docsToInsert.length
  };
}

export async function deleteBlacklistedCompany(id) {
  await dbConnect();
  return companyBlacklistModel.findByIdAndDelete(id).lean();
}

export async function findBlacklistedCompanyMatch({ companyName = '', jobDescription = '', url = '' }) {
  await dbConnect();

  const blacklist = await companyBlacklistModel.find({}, { companyName: 1, normalizedName: 1 }).lean();
  if (!blacklist.length) {
    return null;
  }

  const normalizedCompanyName = normalizeCompanyName(companyName);
  const normalizedSearchText = buildNormalizedSearchText({ companyName, jobDescription, url });

  for (const entry of blacklist) {
    const normalizedName = normalizeCompanyName(entry.normalizedName || entry.companyName);
    if (!normalizedName) {
      continue;
    }

    const directCompanyMatch =
      normalizedCompanyName &&
      (normalizedCompanyName.includes(normalizedName) || normalizedName.includes(normalizedCompanyName));

    const contentMatch = normalizedSearchText.includes(normalizedName);

    if (directCompanyMatch || contentMatch) {
      return entry;
    }
  }

  return null;
}
