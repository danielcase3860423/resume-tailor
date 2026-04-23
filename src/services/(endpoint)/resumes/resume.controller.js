import { CONSTANT_USER_ROLE_ADMIN } from '@/config/constants';
import dbConnect from '@/mongodb';
import { listResumesAcrossClusters } from '@/mongodb-resume';
import { getActiveUserById } from '@/services/(endpoint)/users/user.controller';
import profileModel from '@/models/profile.model';

export async function getResumes({
  skip,
  limit,
  sortBy,
  sortOrder,
  startDate,
  endDate,
  companyName,
  profileId,
  profileName,
  description,
  associatedUserId,
  userId
}) {
  try {
    await dbConnect();

    const filter = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Ensure endDate covers the full day
      end.setUTCHours(23, 59, 59, 999);

      filter.created_at = {
        $gte: start,
        $lte: end
      };
    }

    // Filter by companyName if provided
    if (companyName) {
      filter.companyName = { $regex: new RegExp(`${companyName}`, 'i') };
    }

    // Filter by selected profile name if provided
    if (profileName) {
      const matchingProfiles = await profileModel.find({
        profileName: { $regex: new RegExp(`^${profileName}$`, 'i') }
      });

      filter.associatedProfileId = {
        $in: matchingProfiles.map((profile) => profile._id)
      };
    } else if (profileId) {
      filter.associatedProfileId = profileId;
    }

    if (description) {
      filter.jobDescription = { $regex: description, $options: 'i' };
    }

    // Filter by userId if provided
    const adminUser = await getActiveUserById(userId);
    if (adminUser.role !== CONSTANT_USER_ROLE_ADMIN) {
      filter.associatedUserId = userId;
    } else if (associatedUserId) {
      filter.associatedUserId = associatedUserId;
    }

    return await listResumesAcrossClusters({
      filter,
      projection: {
        companyName: 1,
        jobTitle: 1,
        associatedProfileId: 1,
        associatedUserId: 1,
        created_at: 1,
        storageClusterKey: 1
      },
      sortBy,
      sortOrder,
      skip,
      limit
    });
  } catch (err) {
    console.error('Error fetching resumes:', err);
    throw new Error('Database error while fetching resumes');
  }
}
