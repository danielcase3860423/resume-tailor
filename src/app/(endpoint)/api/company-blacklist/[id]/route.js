export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { sendError } from '@/helpers/endpoint';
import {
  deleteBlacklistedCompany,
  updateBlacklistedCompany
} from '@/services/(endpoint)/company-blacklist/company-blacklist.controller';

export const PUT = async (req, { params }) => {
  try {
    const { companyName } = await req.json();
    const company = await updateBlacklistedCompany(params.id, { companyName });

    if (!company) {
      return sendError(Response, { code: 404, msg: 'Blacklisted company not found' });
    }

    return Response.json({ result: 'success', company });
  } catch (error) {
    console.error('update-company-blacklist error:', error);
    return sendError(Response, { msg: error?.message || 'Failed to update blacklisted company' });
  }
};

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
