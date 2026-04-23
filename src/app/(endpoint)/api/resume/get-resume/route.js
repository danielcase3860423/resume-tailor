export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { sendError } from '@/helpers/endpoint';
import dbConnect from '@/mongodb';
import { findResumeByIdAcrossClusters } from '@/mongodb-resume';
import { getActiveUserById } from '@/services/(endpoint)/users/user.controller';

export const POST = async (req) => {
  try {
    await dbConnect();

    const { resumeId, userId } = await req.json();

    if (!resumeId) {
      return sendError(Response, { msg: 'resumeId is required' });
    }

    if (!userId) {
      return sendError(Response, { msg: 'userId is required' });
    }

    await getActiveUserById(userId);

    const resume = await findResumeByIdAcrossClusters(resumeId);
    if (!resume) {
      return sendError(Response, { code: 404, msg: 'Resume not found' });
    }

    return Response.json({
      result: 'success',
      resume
    });
  } catch (error) {
    console.log(error);
    return sendError(Response, { msg: error?.message || 'Unknown error' });
  }
};
