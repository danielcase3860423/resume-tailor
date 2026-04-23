import mongoose from 'mongoose';

const workExperienceSchema = new mongoose.Schema(
  {
    jobTitle: String,
    employer: String,
    startDate: String,
    endDate: String,
    employeeType: { type: String, default: 'Remote' },
    location: String
  },
  { _id: false }
);

const educationSchema = new mongoose.Schema(
  {
    educationLevel: String,
    fieldOfStudy: String,
    startDate: String,
    yearOfCompletion: String,
    finalEvaluationGrade: String,
    institution: String
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    profileName: { type: String, trim: true },
    profileTitle: String,
    profileMobile: String,
    profileEmail: String,
    profileAddress: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String
    },
    profileLinkedIn: String,
    profileTemplate: { type: String, default: 'template1' },
    profileWorkExperience: [workExperienceSchema],
    profileEducation: [educationSchema]
  },
  {
    collection: 'profile',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

export default mongoose.models.ProfileModel || mongoose.model('ProfileModel', profileSchema);
