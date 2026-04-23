export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { sendError } from '@/helpers/endpoint';
import { getPhones } from '@/services/(endpoint)/phones/phone.controller';

export const GET = async () => {
  try {
    const phones = await getPhones();
    return Response.json({ result: 'success', phones });
  } catch (err) {
    console.error('get-phones error:', err);
    return sendError(Response, { msg: 'Failed to fetch phones' });
  }
};
