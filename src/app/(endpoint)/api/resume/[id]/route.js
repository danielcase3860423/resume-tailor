export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { decodedToken, sendError } from '@/helpers/endpoint';
import { CONSTANT_USER_ROLE_ADMIN } from '@/config/constants';
import { getActiveUserById } from '@/services/(endpoint)/users/user.controller';
import { deleteResumeAcrossClusters } from '@/mongodb-resume';
import { deleteResumeRegistryEntryByResumeId } from '@/services/(endpoint)/resumes/resume-registry.controller';

export const DELETE = async (req, { params }) => {
  try {
    const token = decodedToken(req);
    const userId = token.uuid;
    const currentUser = await getActiveUserById(userId);

    if (currentUser.role !== CONSTANT_USER_ROLE_ADMIN) {
      return sendError(Response, { msg: 'No permission to delete applied history' });
    }

    const { storageClusterKey = '' } = await req.json().catch(() => ({}));
    const deletedResume = await deleteResumeAcrossClusters({
      resumeId: params.id,
      storageClusterKey
    });

    if (!deletedResume) {
      return sendError(Response, { code: 404, msg: 'Applied history not found' });
    }

    await deleteResumeRegistryEntryByResumeId({ resumeId: String(deletedResume._id) });

    return Response.json({
      result: 'success',
      resume: deletedResume
    });
  } catch (err) {
    console.error('delete-resume error:', err);
    return sendError(Response, { msg: err?.message || 'Failed to delete applied history' });
  }
};
