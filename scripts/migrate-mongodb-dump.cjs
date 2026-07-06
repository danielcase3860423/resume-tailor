#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { deserialize } = require('bson');
const { buildJobDescriptionHash, buildResumeContentHash } = require('./shared/resume-history.cjs');

const DEFAULT_DUMP_PATH = '/home/gemini/Documents/dump';
const RESUME_ENV_PREFIX = 'MONGODB_RESUME_URI';
const CONNECTION_OPTIONS = {
  bufferCommands: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 1000 * 1000,
  socketTimeoutMS: 1000 * 1000
};
const CORE_COLLECTIONS = ['user', 'profile', 'phonenumbers'];
const RESUME_COLLECTION = 'resume';

function hashString(value) {
  const text = String(value || '');
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function normalizeEmail(value) {
  return (value || '').toString().trim().toLowerCase();
}

function normalizePhone(value) {
  return (value || '').toString().replace(/\D/g, '');
}

function normalizeStoredPhoneNumber(value) {
  const digits = normalizePhone(value);

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return (value || '').toString().trim();
}

function normalizeLinkedIn(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

function normalizeProfileName(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getProfileIdentityKeys(profile) {
  const keys = [];
  const email = normalizeEmail(profile.profileEmail);
  const phone = normalizePhone(profile.profileMobile);
  const linkedIn = normalizeLinkedIn(profile.profileLinkedIn);
  const profileName = normalizeProfileName(profile.profileName);

  if (email) {
    keys.push(`email:${email}`);
  }

  if (phone) {
    keys.push(`phone:${phone}`);
  }

  if (linkedIn) {
    keys.push(`linkedin:${linkedIn}`);
  }

  if (profileName) {
    keys.push(`name:${profileName}`);
  }

  return keys;
}

function chooseCanonicalProfile(leftProfile, rightProfile) {
  const leftCreatedAt = leftProfile?.created_at ? new Date(leftProfile.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  const rightCreatedAt = rightProfile?.created_at ? new Date(rightProfile.created_at).getTime() : Number.MAX_SAFE_INTEGER;

  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt <= rightCreatedAt ? leftProfile : rightProfile;
  }

  return String(leftProfile._id) <= String(rightProfile._id) ? leftProfile : rightProfile;
}

function mergeUniqueObjects(leftItems = [], rightItems = []) {
  const seen = new Set();
  const merged = [];

  for (const item of [...leftItems, ...rightItems]) {
    const key = JSON.stringify(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(item);
  }

  return merged;
}

function mergeProfileDocuments(baseProfile, duplicateProfile) {
  const merged = { ...baseProfile };
  const scalarFields = ['profileName', 'profileTitle', 'profileMobile', 'profileEmail', 'profileLinkedIn', 'profileTemplate'];

  for (const field of scalarFields) {
    if (!merged[field] && duplicateProfile[field]) {
      merged[field] = duplicateProfile[field];
    }
  }

  merged.profileAddress = {
    ...(baseProfile.profileAddress || {}),
    ...(duplicateProfile.profileAddress || {}),
    street: baseProfile.profileAddress?.street || duplicateProfile.profileAddress?.street || '',
    city: baseProfile.profileAddress?.city || duplicateProfile.profileAddress?.city || '',
    state: baseProfile.profileAddress?.state || duplicateProfile.profileAddress?.state || '',
    zip: baseProfile.profileAddress?.zip || duplicateProfile.profileAddress?.zip || '',
    country: baseProfile.profileAddress?.country || duplicateProfile.profileAddress?.country || ''
  };

  merged.profileWorkExperience = mergeUniqueObjects(baseProfile.profileWorkExperience, duplicateProfile.profileWorkExperience);
  merged.profileEducation = mergeUniqueObjects(baseProfile.profileEducation, duplicateProfile.profileEducation);

  const baseUpdatedAt = baseProfile?.updated_at ? new Date(baseProfile.updated_at).getTime() : 0;
  const duplicateUpdatedAt = duplicateProfile?.updated_at ? new Date(duplicateProfile.updated_at).getTime() : 0;
  if (duplicateUpdatedAt > baseUpdatedAt) {
    merged.updated_at = duplicateProfile.updated_at;
  }

  return merged;
}

function chooseCanonicalPhone(leftPhone, rightPhone) {
  const leftCreatedAt = leftPhone?.created_at ? new Date(leftPhone.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  const rightCreatedAt = rightPhone?.created_at ? new Date(rightPhone.created_at).getTime() : Number.MAX_SAFE_INTEGER;

  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt <= rightCreatedAt ? leftPhone : rightPhone;
  }

  return String(leftPhone._id) <= String(rightPhone._id) ? leftPhone : rightPhone;
}

function mergePhoneDocuments(basePhone, duplicatePhone) {
  const merged = { ...basePhone };
  const scalarFields = ['phoneNumber', 'sipServer', 'sipUsername', 'sipPassword', 'status', 'associatedProfileId', 'associatedUserId'];

  for (const field of scalarFields) {
    if (!merged[field] && duplicatePhone[field]) {
      merged[field] = duplicatePhone[field];
    }
  }

  const baseUpdatedAt = basePhone?.updated_at ? new Date(basePhone.updated_at).getTime() : 0;
  const duplicateUpdatedAt = duplicatePhone?.updated_at ? new Date(duplicatePhone.updated_at).getTime() : 0;
  if (duplicateUpdatedAt > baseUpdatedAt) {
    merged.updated_at = duplicatePhone.updated_at;
  }

  return merged;
}

function chooseCanonicalResume(leftResume, rightResume) {
  const leftCreatedAt = leftResume?.created_at ? new Date(leftResume.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  const rightCreatedAt = rightResume?.created_at ? new Date(rightResume.created_at).getTime() : Number.MAX_SAFE_INTEGER;

  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt <= rightCreatedAt ? leftResume : rightResume;
  }

  return String(leftResume._id) <= String(rightResume._id) ? leftResume : rightResume;
}

function dedupeResumes(resumes, profileIdMap, userIdMap) {
  const resumeByKey = new Map();

  for (const resume of resumes) {
    const transformedResume = {
      ...resume,
      associatedProfileId: remapObjectId(resume.associatedProfileId, profileIdMap),
      associatedUserId: remapObjectId(resume.associatedUserId, userIdMap),
      jobDescriptionHash: buildJobDescriptionHash(resume.jobDescription),
      resumeContentHash: buildResumeContentHash(resume.resumeResponse)
    };

    const dedupeKey = [
      String(transformedResume.associatedProfileId || ''),
      transformedResume.jobDescriptionHash,
      transformedResume.resumeContentHash
    ].join('|');

    if (!transformedResume.associatedProfileId || !transformedResume.resumeContentHash || !transformedResume.jobDescriptionHash) {
      resumeByKey.set(`${dedupeKey}|${transformedResume._id}`, transformedResume);
      continue;
    }

    const existingResume = resumeByKey.get(dedupeKey);
    if (!existingResume) {
      resumeByKey.set(dedupeKey, transformedResume);
      continue;
    }

    const canonicalResume = chooseCanonicalResume(existingResume, transformedResume);
    resumeByKey.set(dedupeKey, canonicalResume);
  }

  return [...resumeByKey.values()];
}

function remapObjectId(value, idMap) {
  if (!value) {
    return value;
  }

  return idMap.get(String(value)) || value;
}

function chooseCanonicalUser(leftUser, rightUser) {
  const leftCreatedAt = leftUser?.created_at ? new Date(leftUser.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  const rightCreatedAt = rightUser?.created_at ? new Date(rightUser.created_at).getTime() : Number.MAX_SAFE_INTEGER;

  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt <= rightCreatedAt ? leftUser : rightUser;
  }

  return String(leftUser._id) <= String(rightUser._id) ? leftUser : rightUser;
}

function mergeStringArrayUnique(leftItems = [], rightItems = []) {
  return [...new Set([...leftItems.map((item) => String(item)), ...rightItems.map((item) => String(item))])].map(
    (item) => new mongoose.Types.ObjectId(item)
  );
}

function mergeUserDocuments(baseUser, duplicateUser) {
  const merged = { ...baseUser };
  const scalarFields = ['username', 'email', 'password', 'status', 'role'];

  for (const field of scalarFields) {
    if (!merged[field] && duplicateUser[field]) {
      merged[field] = duplicateUser[field];
    }
  }

  merged.profiles = mergeStringArrayUnique(baseUser.profiles || [], duplicateUser.profiles || []);

  const baseUpdatedAt = baseUser?.updated_at ? new Date(baseUser.updated_at).getTime() : 0;
  const duplicateUpdatedAt = duplicateUser?.updated_at ? new Date(duplicateUser.updated_at).getTime() : 0;
  if (duplicateUpdatedAt > baseUpdatedAt) {
    merged.updated_at = duplicateUser.updated_at;
  }

  return merged;
}

function dedupeProfiles(profiles) {
  const profileById = new Map(profiles.map((profile) => [String(profile._id), profile]));
  const profileIdMap = new Map();
  const identityOwners = new Map();
  let mergedProfiles = 0;

  for (const profile of profiles) {
    const identityKeys = getProfileIdentityKeys(profile);

    if (!identityKeys.length) {
      profileIdMap.set(String(profile._id), profile._id);
      continue;
    }

    let canonicalProfile = profile;

    for (const identityKey of identityKeys) {
      const existingId = identityOwners.get(identityKey);
      if (!existingId) {
        continue;
      }

      const existingProfile = profileById.get(String(existingId));
      canonicalProfile = chooseCanonicalProfile(canonicalProfile, existingProfile);
    }

    const canonicalId = canonicalProfile._id;
    const canonicalDoc = profileById.get(String(canonicalId)) || canonicalProfile;

    for (const identityKey of identityKeys) {
      const existingId = identityOwners.get(identityKey);
      if (existingId && String(existingId) !== String(canonicalId)) {
        const existingDoc = profileById.get(String(existingId));
        const mergedDoc = mergeProfileDocuments(canonicalDoc, existingDoc);
        profileById.set(String(canonicalId), mergedDoc);
        profileById.delete(String(existingId));
        profileIdMap.set(String(existingId), canonicalId);
        mergedProfiles += 1;

        for (const [ownerKey, ownerId] of identityOwners.entries()) {
          if (String(ownerId) === String(existingId)) {
            identityOwners.set(ownerKey, canonicalId);
          }
        }
      }

      identityOwners.set(identityKey, canonicalId);
    }

    if (String(profile._id) !== String(canonicalId)) {
      const mergedDoc = mergeProfileDocuments(profileById.get(String(canonicalId)), profile);
      profileById.set(String(canonicalId), mergedDoc);
      profileIdMap.set(String(profile._id), canonicalId);
      mergedProfiles += 1;
    } else {
      const mergedDoc = mergeProfileDocuments(profileById.get(String(canonicalId)), profile);
      profileById.set(String(canonicalId), mergedDoc);
      profileIdMap.set(String(profile._id), canonicalId);
    }
  }

  return {
    profiles: [...profileById.values()],
    profileIdMap,
    mergedProfiles
  };
}

function dedupeUsers(users, profileIdMap) {
  const userById = new Map(
    users.map((user) => [
      String(user._id),
      {
        ...user,
        profiles: (user.profiles || []).map((profileId) => remapObjectId(profileId, profileIdMap))
      }
    ])
  );
  const userIdMap = new Map();
  const emailOwners = new Map();
  let mergedUsers = 0;

  for (const user of userById.values()) {
    const email = normalizeEmail(user.email);

    if (!email) {
      userIdMap.set(String(user._id), user._id);
      continue;
    }

    const existingId = emailOwners.get(email);
    if (!existingId) {
      emailOwners.set(email, user._id);
      userIdMap.set(String(user._id), user._id);
      continue;
    }

    const existingUser = userById.get(String(existingId));
    const canonicalUser = chooseCanonicalUser(existingUser, user);
    const duplicateUser = String(canonicalUser._id) === String(existingUser._id) ? user : existingUser;
    const mergedUser = mergeUserDocuments(canonicalUser, duplicateUser);

    userById.set(String(canonicalUser._id), mergedUser);
    userById.delete(String(duplicateUser._id));
    emailOwners.set(email, canonicalUser._id);
    userIdMap.set(String(duplicateUser._id), canonicalUser._id);
    userIdMap.set(String(canonicalUser._id), canonicalUser._id);
    mergedUsers += 1;
  }

  return {
    users: [...userById.values()].map((user) => ({
      ...user,
      profiles: mergeStringArrayUnique(user.profiles || [], [])
    })),
    userIdMap,
    mergedUsers
  };
}

function transformCoreDocuments(coreDocuments) {
  const dedupedProfiles = dedupeProfiles(coreDocuments.profile);
  const dedupedUsers = dedupeUsers(coreDocuments.user, dedupedProfiles.profileIdMap);
  const remappedPhones = coreDocuments.phonenumbers.map((phone) => ({
    ...phone,
    phoneNumber: normalizeStoredPhoneNumber(phone.phoneNumber),
    associatedProfileId: remapObjectId(phone.associatedProfileId, dedupedProfiles.profileIdMap),
    associatedUserId: remapObjectId(phone.associatedUserId, dedupedUsers.userIdMap)
  }));
  const phoneByNumber = new Map();

  for (const phone of remappedPhones) {
    const phoneNumber = phone.phoneNumber;

    if (!phoneNumber) {
      phoneByNumber.set(`${phone._id}`, phone);
      continue;
    }

    const existingPhone = phoneByNumber.get(phoneNumber);
    if (!existingPhone) {
      phoneByNumber.set(phoneNumber, phone);
      continue;
    }

    const canonicalPhone = chooseCanonicalPhone(existingPhone, phone);
    const duplicatePhone = String(canonicalPhone._id) === String(existingPhone._id) ? phone : existingPhone;
    const mergedPhone = mergePhoneDocuments(canonicalPhone, duplicatePhone);
    phoneByNumber.set(phoneNumber, mergedPhone);
  }

  const dedupedPhones = [...phoneByNumber.values()];

  return {
    user: dedupedUsers.users,
    profile: dedupedProfiles.profiles,
    phonenumbers: dedupedPhones,
    profileIdMap: dedupedProfiles.profileIdMap,
    userIdMap: dedupedUsers.userIdMap,
    mergedProfiles: coreDocuments.profile.length - dedupedProfiles.profiles.length,
    mergedUsers: coreDocuments.user.length - dedupedUsers.users.length,
    mergedPhones: coreDocuments.phonenumbers.length - dedupedPhones.length
  };
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function loadLocalEnv() {
  parseEnvFile(path.resolve(process.cwd(), '.env.local'));
  parseEnvFile(path.resolve(process.cwd(), '.env'));
}

function getDumpPath(argv) {
  const customPath = argv.find((arg) => arg.startsWith('--dump='));
  if (customPath) {
    return customPath.slice('--dump='.length);
  }

  return DEFAULT_DUMP_PATH;
}

function getResumeUriEntries({ allowEmpty = false } = {}) {
  const entries = Object.entries(process.env)
    .filter(([key, value]) => key.startsWith(RESUME_ENV_PREFIX) && value && value.trim())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({ key, uri: value.trim() }));

  if (entries.length > 0) {
    return entries;
  }

  if (process.env.MONGODB_URI && process.env.MONGODB_URI.trim()) {
    return [{ key: 'MONGODB_URI', uri: process.env.MONGODB_URI.trim() }];
  }

  if (allowEmpty) {
    return [];
  }

  throw new Error('Missing MONGODB_URI or MONGODB_RESUME_URI* values.');
}

function readBsonDocuments(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const buffer = fs.readFileSync(filePath);
  const docs = [];
  let offset = 0;

  while (offset < buffer.length) {
    const docSize = buffer.readInt32LE(offset);
    const slice = buffer.subarray(offset, offset + docSize);
    docs.push(deserialize(slice));
    offset += docSize;
  }

  return docs;
}

async function connectToUri(uri) {
  return mongoose.createConnection(uri, CONNECTION_OPTIONS).asPromise();
}

async function upsertDocuments(collection, docs) {
  if (!docs.length) {
    return 0;
  }

  const chunkSize = 200;
  for (let index = 0; index < docs.length; index += chunkSize) {
    const chunk = docs.slice(index, index + chunkSize);
    const operations = chunk.map((doc) => ({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true
      }
    }));

    await collection.bulkWrite(operations, { ordered: false });
  }

  return docs.length;
}

async function main() {
  loadLocalEnv();

  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const dumpPath = path.resolve(getDumpPath(argv));

  if (!dryRun && (!process.env.MONGODB_URI || !process.env.MONGODB_URI.trim())) {
    throw new Error('MONGODB_URI is required for core collection migration.');
  }

  if (!fs.existsSync(dumpPath)) {
    throw new Error(`Dump path not found: ${dumpPath}`);
  }

  const resumeEntries = getResumeUriEntries({ allowEmpty: dryRun });
  const dumpDirs = fs
    .readdirSync(dumpPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dumpPath, entry.name))
    .sort((left, right) => left.localeCompare(right));

  if (!dumpDirs.length) {
    throw new Error(`No dump directories found in ${dumpPath}`);
  }

  const summary = {
    dumpDirs: dumpDirs.length,
    core: { user: 0, profile: 0, phonenumbers: 0 },
    resume: 0,
    dedupe: {
      mergedProfiles: 0,
      canonicalProfiles: 0,
      mergedUsers: 0,
      canonicalUsers: 0,
      mergedPhones: 0,
      canonicalPhones: 0,
      mergedResumes: 0,
      canonicalResumes: 0
    }
  };

  const rawCoreDocuments = {
    user: [],
    profile: [],
    phonenumbers: []
  };
  const rawResumeDocuments = [];

  for (const dirPath of dumpDirs) {
    for (const collectionName of CORE_COLLECTIONS) {
      const docs = readBsonDocuments(path.join(dirPath, `${collectionName}.bson`));
      summary.core[collectionName] += docs.length;
      rawCoreDocuments[collectionName].push(...docs);
    }

    const resumeDocs = readBsonDocuments(path.join(dirPath, `${RESUME_COLLECTION}.bson`));
    summary.resume += resumeDocs.length;
    rawResumeDocuments.push(...resumeDocs);
  }

  const transformedCoreDocuments = transformCoreDocuments(rawCoreDocuments);
  const profileIdMap = transformedCoreDocuments.profileIdMap;
  const userIdMap = transformedCoreDocuments.userIdMap;
  summary.dedupe.mergedProfiles = transformedCoreDocuments.mergedProfiles;
  summary.dedupe.canonicalProfiles = transformedCoreDocuments.profile.length;
  summary.dedupe.mergedUsers = transformedCoreDocuments.mergedUsers;
  summary.dedupe.canonicalUsers = transformedCoreDocuments.user.length;
  summary.dedupe.mergedPhones = transformedCoreDocuments.mergedPhones;
  summary.dedupe.canonicalPhones = transformedCoreDocuments.phonenumbers.length;
  const dedupedResumeDocuments = dedupeResumes(rawResumeDocuments, profileIdMap, userIdMap);
  summary.dedupe.mergedResumes = rawResumeDocuments.length - dedupedResumeDocuments.length;
  summary.dedupe.canonicalResumes = dedupedResumeDocuments.length;

  const coreConn = dryRun ? null : await connectToUri(process.env.MONGODB_URI.trim());
  const resumeConns = dryRun ? [] : await Promise.all(resumeEntries.map(async ({ key, uri }) => ({ key, conn: await connectToUri(uri) })));

  try {
    if (!dryRun) {
      for (const collectionName of CORE_COLLECTIONS) {
        const docs = transformedCoreDocuments[collectionName];
        if (docs.length) {
          await upsertDocuments(coreConn.collection(collectionName), docs);
        }
      }
    }

    if (!dryRun && dedupedResumeDocuments.length) {
        const groupedDocs = new Map(resumeEntries.map(({ key }) => [key, []]));

        for (const doc of dedupedResumeDocuments) {
          const target = resumeEntries[hashString(doc._id) % resumeEntries.length];
          groupedDocs.get(target.key).push({
            ...doc,
            storageClusterKey: doc.storageClusterKey || target.key
          });
        }

        for (const { key, conn } of resumeConns) {
          const docsForCluster = groupedDocs.get(key) || [];
          await upsertDocuments(conn.collection(RESUME_COLLECTION), docsForCluster);
        }
    }
  } finally {
    if (coreConn) {
      await coreConn.close();
    }

    for (const target of resumeConns) {
      await target.conn.close();
    }
  }

  console.log(JSON.stringify({ dryRun, dumpPath, resumeTargets: resumeEntries.map(({ key }) => key), summary }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
