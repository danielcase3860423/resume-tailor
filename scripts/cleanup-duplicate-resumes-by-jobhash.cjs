#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { buildJobDescriptionHash } = require('./shared/resume-history.cjs');

const RESUME_ENV_PREFIX = 'MONGODB_RESUME_URI';
const CONNECTION_OPTIONS = {
  bufferCommands: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 1000 * 1000,
  socketTimeoutMS: 1000 * 1000
};
const DELETE_BATCH_SIZE = 1000;

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

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run');
  const clusterArg = argv.find((item) => item.startsWith('--cluster='));
  const limitArg = argv.find((item) => item.startsWith('--limit='));

  return {
    dryRun,
    cluster: clusterArg ? clusterArg.slice('--cluster='.length) : '',
    limit: limitArg ? Math.max(0, parseInt(limitArg.slice('--limit='.length), 10) || 0) : 0
  };
}

function chooseLatest(leftResume, rightResume) {
  const leftCreatedAt = leftResume?.created_at ? new Date(leftResume.created_at).getTime() : 0;
  const rightCreatedAt = rightResume?.created_at ? new Date(rightResume.created_at).getTime() : 0;

  if (leftCreatedAt !== rightCreatedAt) {
    return rightCreatedAt > leftCreatedAt ? rightResume : leftResume;
  }

  return String(rightResume._id || '') > String(leftResume._id || '') ? rightResume : leftResume;
}

async function connectToUri(uri) {
  return mongoose.createConnection(uri, CONNECTION_OPTIONS).asPromise();
}

async function deleteInBatches(collection, ids) {
  let deletedCount = 0;

  for (let index = 0; index < ids.length; index += DELETE_BATCH_SIZE) {
    const batch = ids.slice(index, index + DELETE_BATCH_SIZE);
    if (!batch.length) {
      continue;
    }

    const result = await collection.deleteMany({ _id: { $in: batch } });
    deletedCount += result.deletedCount || 0;
  }

  return deletedCount;
}

async function main() {
  loadLocalEnv();

  const options = parseArgs(process.argv.slice(2));
  const resumeEntries = getResumeUris();

  if (!resumeEntries.length) {
    throw new Error('Missing MONGODB_URI or MONGODB_RESUME_URI* values.');
  }

  const filteredEntries = options.cluster ? resumeEntries.filter((entry) => entry.key === options.cluster) : resumeEntries;
  if (!filteredEntries.length) {
    throw new Error(`No resume cluster entry matched ${options.cluster}`);
  }

  const connections = await Promise.all(filteredEntries.map(async ({ key, uri }) => ({ key, conn: await connectToUri(uri) })));

  try {
    const summary = [];

    for (const { key, conn } of connections) {
      const collection = conn.collection('resume');
      const cursor = collection.find(
        {},
        {
          projection: {
            _id: 1,
            associatedProfileId: 1,
            associatedUserId: 1,
            jobDescriptionHash: 1,
            jobDescription: 1,
            companyName: 1,
            created_at: 1
          }
        }
      );

      const canonicalByKey = new Map();
      const duplicateIds = [];
      let scanned = 0;
      let skippedMissingProfile = 0;
      let skippedMissingHash = 0;

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        scanned += 1;

        if (options.limit && scanned > options.limit) {
          break;
        }

        if (!doc?.associatedProfileId) {
          skippedMissingProfile += 1;
          continue;
        }

        const jobDescriptionHash = doc.jobDescriptionHash || buildJobDescriptionHash(doc.jobDescription || '');
        if (!jobDescriptionHash) {
          skippedMissingHash += 1;
          continue;
        }

        const candidate = {
          _id: doc._id,
          associatedProfileId: doc.associatedProfileId,
          associatedUserId: doc.associatedUserId || null,
          companyName: doc.companyName || '',
          created_at: doc.created_at || null,
          jobDescriptionHash
        };

        const dedupeKey = `${String(candidate.associatedProfileId)}|${candidate.jobDescriptionHash}`;
        const existing = canonicalByKey.get(dedupeKey);

        if (!existing) {
          canonicalByKey.set(dedupeKey, candidate);
          continue;
        }

        const canonical = chooseLatest(existing, candidate);
        const duplicate = String(canonical._id) === String(existing._id) ? candidate : existing;

        canonicalByKey.set(dedupeKey, canonical);
        duplicateIds.push(duplicate._id);
      }

      let deletedCount = 0;
      if (!options.dryRun && duplicateIds.length) {
        deletedCount = await deleteInBatches(collection, duplicateIds);
      }

      summary.push({
        cluster: key,
        scanned,
        uniqueProfileJobPairs: canonicalByKey.size,
        duplicatesFound: duplicateIds.length,
        duplicatesDeleted: deletedCount,
        skippedMissingProfile,
        skippedMissingHash,
        dryRun: options.dryRun
      });
    }

    console.log(JSON.stringify({ summary }, null, 2));
  } finally {
    for (const { conn } of connections) {
      await conn.close();
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
