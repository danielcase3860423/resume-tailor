import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, default: '' },
    email: { type: String, default: '' },
    password: { type: String, default: '' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'INACTIVE' },
    role: { type: String, enum: ['ADMIN', 'VA', 'CALLER'], default: 'VA' },

    // Reference to multiple profiles (normalized)
    profiles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProfileModel' }]
  },
  {
    collection: 'user',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

userSchema.index({ email: 1 }); // Optimized for lookup
export default mongoose.models.UserModel || mongoose.model('UserModel', userSchema);
