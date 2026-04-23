export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { sendError } from '@/helpers/endpoint';
import { getProfiles } from '@/services/(endpoint)/profiles/profile.controller';

export const GET = async () => {
  try {
    const profiles = await getProfiles();
    return Response.json({ result: 'success', profiles });
  } catch (err) {
    console.error('get-profiles error:', err);
    return sendError(Response, { msg: 'Failed to fetch profiles' });
  }
};
