import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    company_name: { type: String, default: '' },
    location: { type: String, default: '' },
    job_url: { type: String, default: '' },
    apply_options: {
      type: Array,
      default: [
        {
          title: { type: String, default: '' },
          link: { type: String, default: '' }
        }
      ]
    },
    extensions: { type: String, default: '' },
    job_id: { type: String, default: '' },
    source_type: { type: String, default: '' },
    board_token: { type: String, default: '' },
    posted_at: { type: Date, default: null }
  },
  {
    collection: 'job',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

jobSchema.index({ job_id: 1 });
jobSchema.index({ posted_at: -1, created_at: -1 });
export default mongoose.models.JobModel || mongoose.model('JobModel', jobSchema);
