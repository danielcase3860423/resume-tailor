export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { sendError } from '@/helpers/endpoint';
import { deleteBlacklistedCompany } from '@/services/(endpoint)/company-blacklist/company-blacklist.controller';

export const DELETE = async (_req, { params }) => {
  try {
    const deleted = await deleteBlacklistedCompany(params.id);

    if (!deleted) {
      return sendError(Response, { code: 404, msg: 'Blacklisted company not found' });
    }

    return Response.json({ result: 'success' });
  } catch (error) {
    console.error('delete-company-blacklist error:', error);
    return sendError(Response, { msg: error?.message || 'Failed to delete blacklisted company' });
  }
};
