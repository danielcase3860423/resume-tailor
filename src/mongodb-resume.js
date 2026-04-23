import mongoose from 'mongoose';
import { getResumeModel } from '@/models/resume.model';

const RESUME_ENV_PREFIX = 'MONGODB_RESUME_URI';
const CONNECTION_OPTIONS = {
  bufferCommands: false,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 30 * 1000,
  socketTimeoutMS: 30 * 1000,
  connectTimeoutMS: 30 * 1000
};

const globalCache = global.resumeMongooseCache || (global.resumeMongooseCache = { entries: new Map() });

function getConfiguredResumeEntries() {
  const resumeEntries = Object.entries(process.env)
    .filter(([key, value]) => key.startsWith(RESUME_ENV_PREFIX) && value && value.trim())
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, uri]) => ({ key, uri: uri.trim() }));

  if (resumeEntries.length > 0) {
    return resumeEntries;
  }

  if (process.env.MONGODB_URI && process.env.MONGODB_URI.trim()) {
    return [{ key: 'MONGODB_URI', uri: process.env.MONGODB_URI.trim() }];
  }

  throw new Error('Please define MONGODB_URI or at least one MONGODB_RESUME_URI* environment variable.');
}

async function getConnectionForEntry(entry) {
  const cached = globalCache.entries.get(entry.key) || {
    uri: null,
    conn: null,
    promise: null
  };

  if (cached.conn && cached.uri === entry.uri) {
    globalCache.entries.set(entry.key, cached);
    return { key: entry.key, conn: cached.conn };
  }

  if (!cached.promise || cached.uri !== entry.uri) {
    cached.uri = entry.uri;
    cached.promise = mongoose
      .createConnection(entry.uri, CONNECTION_OPTIONS)
      .asPromise()
      .then((conn) => conn);
  }

  globalCache.entries.set(entry.key, cached);

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return { key: entry.key, conn: cached.conn };
}

export async function getResumeConnections() {
  const entries = getConfiguredResumeEntries();
  const activeKeys = new Set(entries.map(({ key }) => key));

  for (const cacheKey of [...globalCache.entries.keys()]) {
    if (!activeKeys.has(cacheKey)) {
      globalCache.entries.delete(cacheKey);
    }
  }

  return Promise.all(entries.map((entry) => getConnectionForEntry(entry)));
}

export async function getResumeModels() {
  const connections = await getResumeConnections();
  return connections.map(({ key, conn }) => ({
    key,
    conn,
    model: getResumeModel(conn)
  }));
}

function compareValues(leftValue, rightValue, sortOrder) {
  const left = leftValue instanceof Date ? leftValue.getTime() : leftValue ?? '';
  const right = rightValue instanceof Date ? rightValue.getTime() : rightValue ?? '';

  if (left < right) {
    return -1 * sortOrder;
  }

  if (left > right) {
    return 1 * sortOrder;
  }

  return 0;
}

export async function listResumesAcrossClusters({ filter = {}, projection = null, sortBy = 'created_at', sortOrder = -1, skip = 0, limit = 20 }) {
  const resumeTargets = await getResumeModels();
  const fetchWindow = Math.max(skip + limit, limit);

  const [clusteredResumes, totals] = await Promise.all([
    Promise.all(
      resumeTargets.map(async ({ key, model }) => {
        const docs = await model
          .find(filter, projection)
          .sort({ [sortBy]: sortOrder })
          .limit(fetchWindow)
          .lean();

        return docs.map((doc) => ({
          ...doc,
          storageClusterKey: doc.storageClusterKey || key
        }));
      })
    ),
    Promise.all(resumeTargets.map(async ({ model }) => model.countDocuments(filter)))
  ]);

  const allResumes = clusteredResumes.flat();
  allResumes.sort((left, right) => compareValues(left?.[sortBy], right?.[sortBy], sortOrder));

  return {
    resumes: allResumes.slice(skip, skip + limit),
    total: totals.reduce((sum, count) => sum + count, 0)
  };
}

export async function findResumeByIdAcrossClusters(resumeId, projection = null) {
  if (!mongoose.Types.ObjectId.isValid(resumeId)) {
    return null;
  }

  const resumeTargets = await getResumeModels();
  const results = await Promise.all(
    resumeTargets.map(async ({ key, model }) => {
      const doc = await model.findById(resumeId, projection).lean();
      return doc ? { ...doc, storageClusterKey: doc.storageClusterKey || key } : null;
    })
  );

  return results.find(Boolean) || null;
}

export async function findDuplicateResumeAcrossClusters({ associatedProfileId, jobDescriptionHash, resumeContentHash }) {
  if (!associatedProfileId || !jobDescriptionHash || !resumeContentHash) {
    return null;
  }

  const resumeTargets = await getResumeModels();
  const results = await Promise.all(
    resumeTargets.map(async ({ key, model }) => {
      const doc = await model
        .findOne({
          associatedProfileId,
          jobDescriptionHash,
          resumeContentHash
        })
        .sort({ created_at: 1 })
        .lean();

      return doc ? { ...doc, storageClusterKey: doc.storageClusterKey || key } : null;
    })
  );

  return results.filter(Boolean).sort((left, right) => {
    const leftTime = left?.created_at ? new Date(left.created_at).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right?.created_at ? new Date(right.created_at).getTime() : Number.MAX_SAFE_INTEGER;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return String(left._id).localeCompare(String(right._id));
  })[0] || null;
}

export async function findResumeByProfileAndJobDescriptionAcrossClusters({ associatedProfileId, jobDescriptionHash }) {
  if (!associatedProfileId || !jobDescriptionHash) {
    return null;
  }

  const resumeTargets = await getResumeModels();
  const results = await Promise.all(
    resumeTargets.map(async ({ key, model }) => {
      const doc = await model
        .findOne({
          associatedProfileId,
          jobDescriptionHash
        }, {
          associatedUserId: 1,
          created_at: 1,
          storageClusterKey: 1
        })
        .sort({ created_at: -1 })
        .lean();

      return doc ? { ...doc, storageClusterKey: doc.storageClusterKey || key } : null;
    })
  );

  return results.filter(Boolean).sort((left, right) => {
    const leftTime = left?.created_at ? new Date(left.created_at).getTime() : 0;
    const rightTime = right?.created_at ? new Date(right.created_at).getTime() : 0;

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return String(right._id).localeCompare(String(left._id));
  })[0] || null;
}

export async function listRecentResumesByProfileAcrossClusters({
  associatedProfileId,
  projection = {
    associatedUserId: 1,
    created_at: 1,
    jobDescription: 1,
    jobDescriptionHash: 1,
    storageClusterKey: 1
  },
  limit = 25
}) {
  if (!associatedProfileId) {
    return [];
  }

  const resumeTargets = await getResumeModels();
  const clusteredResumes = await Promise.all(
    resumeTargets.map(async ({ key, model }) => {
      const docs = await model
        .find({ associatedProfileId }, projection)
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();

      return docs.map((doc) => ({
        ...doc,
        storageClusterKey: doc.storageClusterKey || key
      }));
    })
  );

  return clusteredResumes
    .flat()
    .sort((left, right) => {
      const leftTime = left?.created_at ? new Date(left.created_at).getTime() : 0;
      const rightTime = right?.created_at ? new Date(right.created_at).getTime() : 0;

      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }

      return String(right._id || '').localeCompare(String(left._id || ''));
    })
    .slice(0, limit);
}

export async function createResumeAcrossClusters(data) {
  const resumeTargets = await getResumeModels();

  const targetsWithCounts = await Promise.all(
    resumeTargets.map(async ({ key, model }) => ({
      key,
      model,
      count: await model.estimatedDocumentCount()
    }))
  );

  targetsWithCounts.sort((left, right) => {
    if (left.count !== right.count) {
      return left.count - right.count;
    }

    return left.key.localeCompare(right.key);
  });

  const target = targetsWithCounts[0];
  const created = await target.model.create({
    ...data,
    storageClusterKey: data.storageClusterKey || target.key
  });

  return created.toObject();
}

export async function updateResumeAcrossClusters({ resumeId, storageClusterKey = '', updates = {} }) {
  if (!mongoose.Types.ObjectId.isValid(resumeId)) {
    return null;
  }

  const resumeTargets = await getResumeModels();
  const orderedTargets = [...resumeTargets].sort((left, right) => {
    const leftPriority = left.key === storageClusterKey ? -1 : 0;
    const rightPriority = right.key === storageClusterKey ? -1 : 0;
    return leftPriority - rightPriority;
  });

  for (const { key, model } of orderedTargets) {
    const updated = await model
      .findOneAndUpdate({ _id: resumeId }, { $set: updates }, { new: true })
      .lean();

    if (updated) {
      return {
        ...updated,
        storageClusterKey: updated.storageClusterKey || key
      };
    }
  }

  return null;
}

export async function deleteResumeAcrossClusters({ resumeId, storageClusterKey = '' }) {
  if (!mongoose.Types.ObjectId.isValid(resumeId)) {
    return null;
  }

  const resumeTargets = await getResumeModels();
  const orderedTargets = [...resumeTargets].sort((left, right) => {
    const leftPriority = left.key === storageClusterKey ? -1 : 0;
    const rightPriority = right.key === storageClusterKey ? -1 : 0;
    return leftPriority - rightPriority;
  });

  for (const { key, model } of orderedTargets) {
    const deleted = await model.findOneAndDelete({ _id: resumeId }).lean();

    if (deleted) {
      return {
        ...deleted,
        storageClusterKey: deleted.storageClusterKey || key
      };
    }
  }

  return null;
}
