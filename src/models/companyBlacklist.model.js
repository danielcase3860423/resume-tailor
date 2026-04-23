import mongoose from 'mongoose';

const companyBlacklistSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true, unique: true, index: true },
    createdByUserId: { type: String, default: '' }
  },
  {
    collection: 'company_blacklist',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

export default mongoose.models.CompanyBlacklistModel || mongoose.model('CompanyBlacklistModel', companyBlacklistSchema);
