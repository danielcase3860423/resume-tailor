import mongoose from 'mongoose';

const phonenumbersSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, index: true, unique: true },
    sipServer: { type: String },
    sipUsername: { type: String },
    sipPassword: { type: String },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    
    associatedProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProfileModel', index: true },
    associatedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel', index: true }
  },
  {
    collection: 'phonenumbers',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

phonenumbersSchema.index({ associatedUserId: 1, associatedProfileId: 1 }); // fast user/profile resume lookups

export default mongoose.models.PhoneNumbersModel || mongoose.model('PhoneNumbersModel', phonenumbersSchema);
