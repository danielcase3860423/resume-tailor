#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

const CONNECTION_OPTIONS = {
  bufferCommands: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 1000 * 1000,
  socketTimeoutMS: 1000 * 1000
};

const STALE_GENERATING_MS = 10 * 60 * 1000;

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

function normalizeResumeText(value) {
  return (value || '')
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function buildJobDescriptionHash(jobDescription) {
  return crypto.createHash('sha256').update(normalizeResumeText(jobDescription)).digest('hex');
}

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run');
  const limitArg = argv.find((item) => item.startsWith('--limit='));
  const clusterArg = argv.find((item) => item.startsWith('--cluster='));

  return {
    dryRun,
    limit: limitArg ? Math.max(0, parseInt(limitArg.slice('--limit='.length), 10) || 0) : 0,
    cluster: clusterArg ? clusterArg.slice('--cluster='.length) : ''
  };
}

function getMainUri() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  return process.env.MONGODB_URI;
}

function getResumeEntries() {
  const entries = Object.entries(process.env)
    .filter(([key, value]) => key.startsWith('MONGODB_RESUME_URI') && value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, uri]) => ({ key, uri }));

  if (entries.length) {
    return entries;
  }

  return [{ key: 'MONGODB_URI', uri: getMainUri() }];
}

function getDbNameFromUri(uri, fallback = 'test') {
  try {
    const parsed = new URL(uri);
    const pathName = (parsed.pathname || '').replace(/^\//, '');
    return pathName || parsed.searchParams.get('dbName') || parsed.searchParams.get('database') || fallback;
  } catch {
    return fallback;
  }
}

function chooseLatest(left, right) {
  const leftTime = left?.created_at ? new Date(left.created_at).getTime() : 0;
  const rightTime = right?.created_at ? new Date(right.created_at).getTime() : 0;

  if (leftTime !== rightTime) {
    return rightTime > leftTime ? right : left;
  }

  return String(right._id || '') > String(left._id || '') ? right : left;
}

function isFreshGenerating(entry) {
  if (!entry || entry.status !== 'GENERATING') {
    return false;
  }

  const updatedAt = entry.updated_at ? new Date(entry.updated_at).getTime() : 0;
  return updatedAt && Date.now() - updatedAt < STALE_GENERATING_MS;
}

async function ensureIndexes(collection) {
  await collection.createIndex(
    { associatedProfileId: 1, jobDescriptionHash: 1 },
    { unique: true, name: 'resume_registry_profile_job_hash_unique' }
  );
  await collection.createIndex({ status: 1, updated_at: -1 });
  await collection.createIndex({ associatedUserId: 1, created_at: -1 });
}

async function loadResumeCandidates(resumeEntries, options) {
  const candidates = new Map();
  const stats = {
    scanned: 0,
    skippedMissingProfile: 0,
    skippedMissingHash: 0
  };

  const filteredEntries = options.cluster ? resumeEntries.filter((entry) => entry.key === options.cluster) : resumeEntries;
  if (!filteredEntries.length) {
    throw new Error(`No resume cluster entry matched ${options.cluster}`);
  }

  for (const entry of filteredEntries) {
    const conn = await mongoose.createConnection(entry.uri, CONNECTION_OPTIONS).asPromise();

    try {
      const dbName = conn.name || getDbNameFromUri(entry.uri);
      const collection = conn.db.collection('resume');
      const cursor = collection.find(
        {},
        {
          projection: {
            associatedProfileId: 1,
            associatedUserId: 1,
            jobDescriptionHash: 1,
            jobDescription: 1,
            companyName: 1,
            jobTitle: 1,
            created_at: 1,
            storageClusterKey: 1
          }
        }
      );

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        stats.scanned += 1;

        if (options.limit && stats.scanned > options.limit) {
          return { candidates, stats };
        }

        if (!doc?.associatedProfileId) {
          stats.skippedMissingProfile += 1;
          continue;
        }

        const jobDescriptionHash = doc.jobDescriptionHash || buildJobDescriptionHash(doc.jobDescription || '');
        if (!jobDescriptionHash) {
          stats.skippedMissingHash += 1;
          continue;
        }

        const candidate = {
          _id: doc._id,
          associatedProfileId: doc.associatedProfileId,
          associatedUserId: doc.associatedUserId || null,
          jobDescriptionHash,
          companyName: doc.companyName || '',
          jobTitle: doc.jobTitle || '',
          storageClusterKey: doc.storageClusterKey || entry.key,
          resumeId: String(doc._id),
          status: 'READY',
          errorMessage: '',
          created_at: doc.created_at || new Date(),
          updated_at: doc.created_at || new Date(),
          sourceDbName: dbName
        };

        const dedupeKey = `${String(candidate.associatedProfileId)}|${candidate.jobDescriptionHash}`;
        const existing = candidates.get(dedupeKey);
        candidates.set(dedupeKey, existing ? chooseLatest(existing, candidate) : candidate);
      }
    } finally {
      await conn.close();
    }
  }

  return { candidates, stats };
}

async function main() {
  loadLocalEnv();
  const options = parseArgs(process.argv.slice(2));
  const mainUri = getMainUri();
  const resumeEntries = getResumeEntries();
  const mainConn = await mongoose.createConnection(mainUri, CONNECTION_OPTIONS).asPromise();

  try {
    const mainDbName = mainConn.name || getDbNameFromUri(mainUri);
    const registryCollection = mainConn.db.collection('resume_registry');
    await ensureIndexes(registryCollection);

    const { candidates, stats } = await loadResumeCandidates(resumeEntries, options);
    const existingEntries = await registryCollection
      .find(
        {},
        {
          projection: {
            associatedProfileId: 1,
            jobDescriptionHash: 1,
            status: 1,
            updated_at: 1
          }
        }
      )
      .toArray();

    const existingMap = new Map(
      existingEntries.map((entry) => [`${String(entry.associatedProfileId)}|${entry.jobDescriptionHash}`, entry])
    );

    const operations = [];
    let skippedFreshGenerating = 0;

    for (const [key, candidate] of candidates.entries()) {
      const existing = existingMap.get(key);
      if (isFreshGenerating(existing)) {
        skippedFreshGenerating += 1;
        continue;
      }

      operations.push({
        updateOne: {
          filter: {
            associatedProfileId: candidate.associatedProfileId,
            jobDescriptionHash: candidate.jobDescriptionHash
          },
          update: {
            $set: {
              associatedUserId: candidate.associatedUserId,
              companyName: candidate.companyName,
              jobTitle: candidate.jobTitle,
              storageClusterKey: candidate.storageClusterKey,
              resumeId: candidate.resumeId,
              status: 'READY',
              errorMessage: '',
              updated_at: candidate.updated_at
            },
            $setOnInsert: {
              associatedProfileId: candidate.associatedProfileId,
              jobDescriptionHash: candidate.jobDescriptionHash,
              created_at: candidate.created_at
            }
          },
          upsert: true
        }
      });
    }

    const summary = {
      mainDbName,
      resumeSources: resumeEntries.map((entry) => entry.key),
      scannedResumes: stats.scanned,
      uniqueRegistryCandidates: candidates.size,
      skippedMissingProfile: stats.skippedMissingProfile,
      skippedMissingHash: stats.skippedMissingHash,
      skippedFreshGenerating,
      plannedUpserts: operations.length,
      dryRun: options.dryRun
    };

    if (options.dryRun || !operations.length) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    const result = await registryCollection.bulkWrite(operations, { ordered: false });
    console.log(
      JSON.stringify(
        {
          ...summary,
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          upsertedCount: result.upsertedCount
        },
        null,
        2
      )
    );
  } finally {
    await mainConn.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
