import mongoose from 'mongoose';

const resumeRegistrySchema = new mongoose.Schema(
  {
    associatedProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProfileModel', required: true, index: true },
    associatedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel', index: true },
    jobDescriptionHash: { type: String, required: true, index: true },
    companyName: { type: String, default: '' },
    jobTitle: { type: String, default: '' },
    storageClusterKey: { type: String, default: '' },
    resumeId: { type: String, default: '' },
    status: { type: String, enum: ['GENERATING', 'READY', 'FAILED'], default: 'GENERATING', index: true },
    errorMessage: { type: String, default: '' }
  },
  {
    collection: 'resume_registry',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

resumeRegistrySchema.index({ associatedProfileId: 1, jobDescriptionHash: 1 }, { unique: true, name: 'resume_registry_profile_job_hash_unique' });
resumeRegistrySchema.index({ status: 1, updated_at: -1 });
resumeRegistrySchema.index({ associatedUserId: 1, created_at: -1 });

export function getResumeRegistryModel(connection = mongoose) {
  return connection.models.ResumeRegistryModel || connection.model('ResumeRegistryModel', resumeRegistrySchema);
}

export default getResumeRegistryModel();
