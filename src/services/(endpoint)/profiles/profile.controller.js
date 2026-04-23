import profileModel from '@/models/profile.model';
import userModel from '@/models/user.model';
import dbConnect from '@/mongodb';
// 🧩 Get all profiles
export async function getProfiles() {
  try {
    await dbConnect();

    // const profiles = await profileModel.find({}).lean();
    const profiles = await profileModel.find({});
    return profiles;
  } catch (err) {
    console.error('Error fetching profiles:', err);
    throw new Error('Database error while fetching profiles');
  }
}

export async function createProfile(data) {
  try {
    await dbConnect();

    const newProfile = await profileModel.create(data);
    return newProfile.toObject();
  } catch (err) {
    console.error('Error creating profile:', err);
    throw new Error('Database error while creating profile');
  }
}

// UPDATE
export async function updateProfileById(id, updates) {
  try {
    await dbConnect();

    const updated = await profileModel.findByIdAndUpdate(id, updates, { new: true }).lean();
    return updated;
  } catch (err) {
    console.error('Error updating profile:', err);
    throw new Error('Database error while updating profile');
  }
}

// DELETE
export async function deleteProfileById(id) {
  try {
    await dbConnect();

    const deleted = await profileModel.findByIdAndDelete(id).lean();
    return deleted;
  } catch (err) {
    console.error('Error deleting profile:', err);
    throw new Error('Database error while deleting profile');
  }
}

//Get Prfoiles by UserId
export async function getProfilesByUserId(userId) {
  try {
    await dbConnect();

    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return await profileModel.find({ _id: { $in: user.profiles || [] } });
  } catch (err) {
    console.error('Error fetching profiles by userId:', err);
    throw new Error('Database error while fetching profiles by userId');
  }
}
