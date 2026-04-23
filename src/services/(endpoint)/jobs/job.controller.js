import jobModel from '@/models/job.model';
import dbConnect from '@/mongodb';

export async function getJobs({ skip, limit, company, title, extension }) {
  try {
    await dbConnect();
    const filter = {};

    // Filter by company if provided
    if (company) {
      filter.company_name = { $regex: new RegExp(`${company}`, 'i') };
    }

    // Filter by title if provided
    if (title) {
      filter.title = { $regex: title, $options: 'i' };
    }

    if (extension) {
      filter.extensions = { $regex: extension, $options: 'i' };
    }

    const jobs = await jobModel.find(filter).sort({ created_at: -1, _id: -1 }).skip(skip).limit(limit).lean();
    const total = await jobModel.countDocuments(filter);
    return { jobs, total };
  } catch (err) {
    console.error('Error fetching jobs:', err);
    throw new Error('Database error while fetching jobs');
  }
}

export async function deleteJobById(id) {
  try {
    await dbConnect();

    const deleted = await jobModel.findByIdAndDelete(id).lean();
    return deleted;
  } catch (err) {
    console.error('Error deleting job:', err);
    throw new Error('Database error while deleting job');
  }
}
