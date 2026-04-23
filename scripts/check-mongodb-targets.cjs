#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

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

function getEntries() {
  const entries = [];

  if (process.env.MONGODB_URI) {
    entries.push({ key: 'MONGODB_URI', uri: process.env.MONGODB_URI });
  }

  for (const [key, value] of Object.entries(process.env)
    .filter(([envKey, envValue]) => envKey.startsWith('MONGODB_RESUME_URI') && envValue)
    .sort(([left], [right]) => left.localeCompare(right))) {
    entries.push({ key, uri: value });
  }

  return entries;
}

async function inspectEntry(entry) {
  const conn = await mongoose.createConnection(entry.uri, CONNECTION_OPTIONS).asPromise();

  try {
    const dbName = conn.name;
    const collections = await conn.db.listCollections().toArray();
    const counts = {};

    for (const collection of collections) {
      counts[collection.name] = await conn.db.collection(collection.name).countDocuments();
    }

    return {
      key: entry.key,
      dbName,
      collections: counts
    };
  } finally {
    await conn.close();
  }
}

async function main() {
  loadLocalEnv();
  const entries = getEntries();

  if (!entries.length) {
    throw new Error('No MongoDB URIs found in .env or .env.local');
  }

  const results = [];
  for (const entry of entries) {
    results.push(await inspectEntry(entry));
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
