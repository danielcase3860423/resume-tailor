export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { deleteJobById } from '@/services/(endpoint)/jobs/job.controller';
import { decodedToken, sendError } from '@/helpers/endpoint';
import { CONSTANT_USER_ROLE_ADMIN } from '@/config/constants';
import { getActiveUserById } from '@/services/(endpoint)/users/user.controller';

export const DELETE = async (req, { params }) => {
  try {
    const token = decodedToken(req);
    const userId = token.uuid;
    const adminUser = await getActiveUserById(userId);

    if (adminUser.role === CONSTANT_USER_ROLE_ADMIN) {
      const { id } = params;
      const deletedJob = await deleteJobById(id);

      return Response.json({
        result: 'success',
        job: deletedJob
      });
    } else {
      return sendError(Response, { msg: 'No permission to delete job' });
    }
  } catch (err) {
    console.error('delete-job error:', err);
    return sendError(Response, { msg: 'Failed to delete job' });
  }
};
