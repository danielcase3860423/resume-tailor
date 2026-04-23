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

async function connectToUri(uri) {
  return mongoose.createConnection(uri, CONNECTION_OPTIONS).asPromise();
}

async function main() {
  loadLocalEnv();

  const dryRun = process.argv.slice(2).includes('--dry-run');
  if (!process.env.MONGODB_URI || !process.env.MONGODB_URI.trim()) {
    throw new Error('MONGODB_URI is required.');
  }

  const coreConn = await connectToUri(process.env.MONGODB_URI.trim());

  try {
    const phoneCollection = coreConn.collection('phonenumbers');
    const phones = await phoneCollection.find({}).toArray();
    const phoneByNumber = new Map();
    const duplicateIds = [];

    for (const phone of phones) {
      const normalizedPhone = normalizeStoredPhoneNumber(phone.phoneNumber);
      const normalizedDoc = { ...phone, phoneNumber: normalizedPhone };

      if (!normalizedPhone) {
        phoneByNumber.set(String(phone._id), normalizedDoc);
        continue;
      }

      const existingPhone = phoneByNumber.get(normalizedPhone);
      if (!existingPhone) {
        phoneByNumber.set(normalizedPhone, normalizedDoc);
        continue;
      }

      const canonicalPhone = chooseCanonicalPhone(existingPhone, normalizedDoc);
      const duplicatePhone = String(canonicalPhone._id) === String(existingPhone._id) ? normalizedDoc : existingPhone;
      phoneByNumber.set(normalizedPhone, mergePhoneDocuments(canonicalPhone, duplicatePhone));
      duplicateIds.push(String(duplicatePhone._id));
    }

    const mergedPhones = [...phoneByNumber.values()];
    const summary = {
      rawPhones: phones.length,
      canonicalPhones: mergedPhones.length,
      mergedPhones: duplicateIds.length
    };

    if (dryRun) {
      console.log(JSON.stringify({ dryRun, summary, duplicateIds }, null, 2));
      return;
    }

    if (mergedPhones.length) {
      const replaceOps = mergedPhones.map((phone) => ({
        replaceOne: {
          filter: { _id: phone._id },
          replacement: phone,
          upsert: true
        }
      }));

      await phoneCollection.bulkWrite(replaceOps, { ordered: false });
    }

    if (duplicateIds.length) {
      await phoneCollection.deleteMany({
        _id: { $in: duplicateIds.map((id) => new mongoose.Types.ObjectId(id)) }
      });
    }

    console.log(JSON.stringify({ dryRun, summary, duplicateIds }, null, 2));
  } finally {
    await coreConn.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
