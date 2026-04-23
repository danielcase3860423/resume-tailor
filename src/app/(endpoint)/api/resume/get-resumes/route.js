export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getResumes } from '@/services/(endpoint)/resumes/resume.controller';
import { decodedToken, sendError } from '@/helpers/endpoint';
import { getActiveUserById } from '@/services/(endpoint)/users/user.controller';

export const GET = async (req) => {
  const token = decodedToken(req);
  const url = new URL(req.url, `http://${req.headers.host}`);
  const params = new URLSearchParams(url.search); // Parse query parameters

  // Get page and limit from URL, with defaults if not provided
  const page = parseInt(params.get('page') || 1, 10); // Default to 1 if not set
  const limit = parseInt(params.get('limit') || 20, 10); // Default to 20 if not set

  console.log('Page:', page, 'Limit:', limit); // Debugging query params

  const sortBy = params.get('sortBy') || params.get('sortby') || 'created_at';
  const sortOrder = params.get('order') === 'ascend' ? 1 : -1;

  const startDate = params.get('startDate');
  const endDate = params.get('endDate');

  const companyName = params.get('companyName');
  const profileId = params.get('profileId');
  const profileName = params.get('profileName');
  const associatedUserId = params.get('associatedUserId');
  
  const userId = token.uuid;
  const description = params.get('description');

  try {
    await getActiveUserById(userId);
    const skip = (page - 1) * limit;
    const { resumes, total } = await getResumes({
      skip,
      limit,
      sortBy,
      sortOrder,
      startDate,
      endDate,
      companyName,
      profileId,
      profileName,
      associatedUserId,
      description,
      userId
    });
    return Response.json({
      result: 'success',
      resumes,
      total,
      currentPage: page,
      pageSize: limit,
      hasMore: page * limit < total
    });
  } catch (err) {
    console.error('get-resumes error:', err);
    return sendError(Response, { msg: 'Failed to fetch resumes' });
  }
};
