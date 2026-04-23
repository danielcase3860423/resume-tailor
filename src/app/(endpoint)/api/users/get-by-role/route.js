export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getUsersByRole } from '@/services/(endpoint)/users/user.controller';
import { sendError } from '@/helpers/endpoint';

export const GET = async () => {
  try {
    const users = await getUsersByRole();
    return Response.json({ result: 'success', users });
  } catch (err) {
    console.error('get-users error:', err);
    return sendError(Response, { msg: 'Failed to fetch users' });
  }
};
