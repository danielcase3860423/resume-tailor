#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { buildJobDescriptionHash, buildResumeContentHash } = require('./shared/resume-history.cjs');

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


function chooseCanonicalResume(leftResume, rightResume) {
  const leftCreatedAt = leftResume?.created_at ? new Date(leftResume.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  const rightCreatedAt = rightResume?.created_at ? new Date(rightResume.created_at).getTime() : Number.MAX_SAFE_INTEGER;

  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt <= rightCreatedAt ? leftResume : rightResume;
  }

  return String(leftResume._id) <= String(rightResume._id) ? leftResume : rightResume;
}

async function connectToUri(uri) {
  return mongoose.createConnection(uri, CONNECTION_OPTIONS).asPromise();
}

async function main() {
  loadLocalEnv();

  const dryRun = process.argv.slice(2).includes('--dry-run');
  const resumeEntries = getResumeUris();

  if (!resumeEntries.length) {
    throw new Error('Missing MONGODB_URI or MONGODB_RESUME_URI* values.');
  }

  const connections = await Promise.all(resumeEntries.map(async ({ key, uri }) => ({ key, conn: await connectToUri(uri) })));

  try {
    const allDocs = [];

    for (const { key, conn } of connections) {
      const docs = await conn.collection('resume').find({}).toArray();
      allDocs.push(...docs.map((doc) => ({ ...doc, storageClusterKey: doc.storageClusterKey || key })));
    }

    const canonicalByKey = new Map();
    const duplicateEntries = [];

    for (const doc of allDocs) {
      const normalizedDoc = {
        ...doc,
        jobDescriptionHash: buildJobDescriptionHash(doc.jobDescription),
        resumeContentHash: buildResumeContentHash(doc.resumeResponse)
      };
      const dedupeKey = [
        String(normalizedDoc.associatedProfileId || ''),
        normalizedDoc.jobDescriptionHash,
        normalizedDoc.resumeContentHash
      ].join('|');

      if (!normalizedDoc.associatedProfileId || !normalizedDoc.jobDescriptionHash || !normalizedDoc.resumeContentHash) {
        canonicalByKey.set(`${dedupeKey}|${normalizedDoc._id}`, normalizedDoc);
        continue;
      }

      const existingDoc = canonicalByKey.get(dedupeKey);
      if (!existingDoc) {
        canonicalByKey.set(dedupeKey, normalizedDoc);
        continue;
      }

      const canonicalDoc = chooseCanonicalResume(existingDoc, normalizedDoc);
      const duplicateDoc = String(canonicalDoc._id) === String(existingDoc._id) ? normalizedDoc : existingDoc;
      canonicalByKey.set(dedupeKey, canonicalDoc);
      duplicateEntries.push({
        id: String(duplicateDoc._id),
        storageClusterKey: duplicateDoc.storageClusterKey,
        associatedProfileId: String(duplicateDoc.associatedProfileId || ''),
        companyName: duplicateDoc.companyName || '',
        created_at: duplicateDoc.created_at
      });
    }

    const canonicalDocs = [...canonicalByKey.values()];
    const summary = {
      rawResumes: allDocs.length,
      canonicalResumes: canonicalDocs.length,
      mergedResumes: duplicateEntries.length
    };

    if (dryRun) {
      console.log(JSON.stringify({ dryRun, summary, duplicateEntries: duplicateEntries.slice(0, 100) }, null, 2));
      return;
    }

    const docsByCluster = new Map(connections.map(({ key }) => [key, []]));
    const duplicateIdsByCluster = new Map(connections.map(({ key }) => [key, []]));

    for (const doc of canonicalDocs) {
      docsByCluster.get(doc.storageClusterKey).push(doc);
    }

    for (const duplicate of duplicateEntries) {
      duplicateIdsByCluster.get(duplicate.storageClusterKey).push(new mongoose.Types.ObjectId(duplicate.id));
    }

    for (const { key, conn } of connections) {
      const docs = docsByCluster.get(key) || [];
      if (docs.length) {
        const operations = docs.map((doc) => ({
          replaceOne: {
            filter: { _id: doc._id },
            replacement: doc,
            upsert: true
          }
        }));

        await conn.collection('resume').bulkWrite(operations, { ordered: false });
      }

      const duplicateIds = duplicateIdsByCluster.get(key) || [];
      if (duplicateIds.length) {
        await conn.collection('resume').deleteMany({ _id: { $in: duplicateIds } });
      }
    }

    console.log(JSON.stringify({ dryRun, summary, duplicateEntries: duplicateEntries.slice(0, 100) }, null, 2));
  } finally {
    for (const { conn } of connections) {
      await conn.close();
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
