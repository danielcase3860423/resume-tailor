import dbConnect from '@/mongodb';
import resumeRegistryModel from '@/models/resumeRegistry.model';

const GENERATION_STALE_MS = 10 * 60 * 1000;

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

function isFreshGenerating(registryEntry) {
  if (!registryEntry || registryEntry.status !== 'GENERATING') {
    return false;
  }

  const updatedAt = registryEntry.updated_at ? new Date(registryEntry.updated_at).getTime() : 0;
  if (!updatedAt) {
    return false;
  }

  return Date.now() - updatedAt < GENERATION_STALE_MS;
}

export async function getResumeRegistryEntry({ associatedProfileId, jobDescriptionHash }) {
  await dbConnect();
  return resumeRegistryModel.findOne({ associatedProfileId, jobDescriptionHash }).lean();
}

export async function claimResumeGeneration({ associatedProfileId, associatedUserId, jobDescriptionHash }) {
  await dbConnect();

  const existing = await resumeRegistryModel.findOne({ associatedProfileId, jobDescriptionHash });

  if (!existing) {
    try {
      const created = await resumeRegistryModel.create({
        associatedProfileId,
        associatedUserId,
        jobDescriptionHash,
        status: 'GENERATING'
      });

      return { state: 'CLAIMED', entry: created.toObject() };
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      return claimResumeGeneration({ associatedProfileId, associatedUserId, jobDescriptionHash });
    }
  }

  if (existing.status === 'READY') {
    return { state: 'READY', entry: existing.toObject() };
  }

  if (isFreshGenerating(existing)) {
    return { state: 'GENERATING', entry: existing.toObject() };
  }

  const reclaimed = await resumeRegistryModel.findOneAndUpdate(
    {
      _id: existing._id,
      updated_at: existing.updated_at
    },
    {
      $set: {
        associatedUserId,
        status: 'GENERATING',
        errorMessage: ''
      },
      $unset: {
        resumeId: 1,
        storageClusterKey: 1
      }
    },
    { new: true }
  );

  if (!reclaimed) {
    return claimResumeGeneration({ associatedProfileId, associatedUserId, jobDescriptionHash });
  }

  return { state: 'CLAIMED', entry: reclaimed.toObject() };
}

export async function markResumeGenerationReady({
  registryId,
  associatedUserId,
  companyName,
  jobTitle,
  resumeId,
  storageClusterKey
}) {
  await dbConnect();

  return resumeRegistryModel
    .findByIdAndUpdate(
      registryId,
      {
        $set: {
          associatedUserId,
          companyName: cleanString(companyName),
          jobTitle: cleanString(jobTitle),
          resumeId: cleanString(resumeId),
          storageClusterKey: cleanString(storageClusterKey),
          status: 'READY',
          errorMessage: ''
        }
      },
      { new: true }
    )
    .lean();
}

export async function markResumeGenerationFailed({ registryId, errorMessage }) {
  if (!registryId) {
    return null;
  }

  await dbConnect();

  return resumeRegistryModel
    .findByIdAndUpdate(
      registryId,
      {
        $set: {
          status: 'FAILED',
          errorMessage: cleanString(errorMessage)
        }
      },
      { new: true }
    )
    .lean();
}

export async function reclaimResumeGeneration({ registryId, associatedUserId }) {
  if (!registryId) {
    return null;
  }

  await dbConnect();

  return resumeRegistryModel
    .findByIdAndUpdate(
      registryId,
      {
        $set: {
          associatedUserId,
          status: 'GENERATING',
          errorMessage: ''
        },
        $unset: {
          resumeId: 1,
          storageClusterKey: 1
        }
      },
      { new: true }
    )
    .lean();
}

export async function syncResumeRegistryMetadata({ associatedProfileId, jobDescriptionHash, companyName, jobTitle, resumeId, storageClusterKey }) {
  await dbConnect();

  return resumeRegistryModel
    .findOneAndUpdate(
      { associatedProfileId, jobDescriptionHash },
      {
        $set: {
          companyName: cleanString(companyName),
          jobTitle: cleanString(jobTitle),
          resumeId: cleanString(resumeId),
          storageClusterKey: cleanString(storageClusterKey),
          status: 'READY'
        }
      },
      { new: true }
    )
    .lean();
}

export async function deleteResumeRegistryEntryByResumeId({ resumeId }) {
  if (!resumeId) {
    return null;
  }

  await dbConnect();

  return resumeRegistryModel.findOneAndDelete({ resumeId: cleanString(resumeId) }).lean();
}
