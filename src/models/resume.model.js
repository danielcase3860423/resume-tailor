import mongoose from 'mongoose';

export const resumeSchema = new mongoose.Schema(
  {
    companyName: { type: String, index: true },
    jobTitle: { type: String, index: true },
    jobLink: String,
    jobDescription: String,

    resumePrompt: String,
    resumeResponse: { type: Object, default: {} },
    resumeBuiltModel: String,
    resumeFileName: String,
    storageClusterKey: { type: String, default: '' },
    jobDescriptionHash: { type: String, index: true, default: '' },
    resumeContentHash: { type: String, index: true, default: '' },

    associatedProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProfileModel', index: true },
    associatedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel', index: true }
  },
  {
    collection: 'resume',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

resumeSchema.index({ associatedUserId: 1, associatedProfileId: 1 }); // fast user/profile resume lookups
resumeSchema.index({ associatedProfileId: 1, jobDescriptionHash: 1, resumeContentHash: 1 });

export function getResumeModel(connection = mongoose) {
  return connection.models.ResumeModel || connection.model('ResumeModel', resumeSchema);
}

export default getResumeModel();
