#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const RESUME_ENV_PREFIX = 'MONGODB_RESUME_URI';
const CONNECTION_OPTIONS = {
  bufferCommands: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 1000 * 1000,
  socketTimeoutMS: 1000 * 1000
};

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

function normalizeEmail(value) {
  return (value || '').toString().trim().toLowerCase();
}

function normalizePhone(value) {
  return (value || '').toString().replace(/\D/g, '');
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

function remapObjectId(value, idMap) {
  if (!value) {
    return value;
  }

  return idMap.get(String(value)) || value;
}

function dedupeProfiles(profiles) {
  const profileById = new Map(profiles.map((profile) => [String(profile._id), profile]));
  const profileIdMap = new Map();
  const identityOwners = new Map();

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
    } else {
      const mergedDoc = mergeProfileDocuments(profileById.get(String(canonicalId)), profile);
      profileById.set(String(canonicalId), mergedDoc);
      profileIdMap.set(String(profile._id), canonicalId);
    }
  }

  const duplicateEntries = [...profileIdMap.entries()].filter(([fromId, toId]) => fromId !== String(toId));

  return {
    mergedProfiles: [...profileById.values()],
    profileIdMap,
    duplicateEntries
  };
}

function getResumeUris() {
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

  return [];
}

async function connectToUri(uri) {
  return mongoose.createConnection(uri, CONNECTION_OPTIONS).asPromise();
}

async function rewriteUsers(coreDb, profileIdMap) {
  const users = await coreDb.collection('user').find({}).toArray();

  if (!users.length) {
    return 0;
  }

  const operations = users.map((user) => {
    const nextProfiles = [...new Set((user.profiles || []).map((profileId) => String(remapObjectId(profileId, profileIdMap))))].map(
      (profileId) => new mongoose.Types.ObjectId(profileId)
    );

    return {
      replaceOne: {
        filter: { _id: user._id },
        replacement: {
          ...user,
          profiles: nextProfiles
        }
      }
    };
  });

  const result = await coreDb.collection('user').bulkWrite(operations, { ordered: false });
  return result.modifiedCount || 0;
}

async function rewritePhones(coreDb, duplicateEntries) {
  let touched = 0;

  for (const [fromId, toId] of duplicateEntries) {
    const result = await coreDb.collection('phonenumbers').updateMany(
      { associatedProfileId: new mongoose.Types.ObjectId(fromId) },
      { $set: { associatedProfileId: new mongoose.Types.ObjectId(String(toId)) } }
    );
    touched += result.modifiedCount || 0;
  }

  return touched;
}

async function rewriteResumes(resumeConnections, duplicateEntries) {
  let touched = 0;

  for (const { key, conn } of resumeConnections) {
    for (const [fromId, toId] of duplicateEntries) {
      const result = await conn.collection('resume').updateMany(
        { associatedProfileId: new mongoose.Types.ObjectId(fromId) },
        {
          $set: {
            associatedProfileId: new mongoose.Types.ObjectId(String(toId)),
            storageClusterKey: key
          }
        }
      );
      touched += result.modifiedCount || 0;
    }
  }

  return touched;
}

async function upsertMergedProfiles(coreDb, mergedProfiles) {
  if (!mergedProfiles.length) {
    return 0;
  }

  const operations = mergedProfiles.map((profile) => ({
    replaceOne: {
      filter: { _id: profile._id },
      replacement: profile,
      upsert: true
    }
  }));

  const result = await coreDb.collection('profile').bulkWrite(operations, { ordered: false });
  return (result.modifiedCount || 0) + (result.upsertedCount || 0);
}

async function deleteDuplicateProfiles(coreDb, duplicateEntries) {
  if (!duplicateEntries.length) {
    return 0;
  }

  const ids = duplicateEntries.map(([fromId]) => new mongoose.Types.ObjectId(fromId));
  const result = await coreDb.collection('profile').deleteMany({ _id: { $in: ids } });
  return result.deletedCount || 0;
}

async function main() {
  loadLocalEnv();

  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');

  if (!process.env.MONGODB_URI || !process.env.MONGODB_URI.trim()) {
    throw new Error('MONGODB_URI is required.');
  }

  const coreConn = await connectToUri(process.env.MONGODB_URI.trim());
  const resumeEntries = getResumeUris();
  const resumeConnections = await Promise.all(resumeEntries.map(async ({ key, uri }) => ({ key, conn: await connectToUri(uri) })));

  try {
    const profiles = await coreConn.collection('profile').find({}).toArray();
    const { mergedProfiles, profileIdMap, duplicateEntries } = dedupeProfiles(profiles);

    const duplicateSummary = duplicateEntries.map(([fromId, toId]) => {
      const source = profiles.find((profile) => String(profile._id) === fromId);
      const target = mergedProfiles.find((profile) => String(profile._id) === String(toId));

      return {
        fromId,
        toId: String(toId),
        name: source?.profileName || target?.profileName || '',
        email: source?.profileEmail || target?.profileEmail || '',
        phone: source?.profileMobile || target?.profileMobile || '',
        linkedIn: source?.profileLinkedIn || target?.profileLinkedIn || ''
      };
    });

    const summary = {
      dryRun,
      beforeProfiles: profiles.length,
      canonicalProfiles: mergedProfiles.length,
      duplicateProfiles: duplicateEntries.length,
      duplicates: duplicateSummary
    };

    if (dryRun || !duplicateEntries.length) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    const usersTouched = await rewriteUsers(coreConn, profileIdMap);
    const phonesTouched = await rewritePhones(coreConn, duplicateEntries);
    const resumesTouched = await rewriteResumes(resumeConnections, duplicateEntries);
    await upsertMergedProfiles(coreConn, mergedProfiles);
    const deletedProfiles = await deleteDuplicateProfiles(coreConn, duplicateEntries);

    console.log(
      JSON.stringify(
        {
          ...summary,
          usersTouched,
          phonesTouched,
          resumesTouched,
          deletedProfiles
        },
        null,
        2
      )
    );
  } finally {
    await coreConn.close();
    for (const { conn } of resumeConnections) {
      await conn.close();
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
