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
