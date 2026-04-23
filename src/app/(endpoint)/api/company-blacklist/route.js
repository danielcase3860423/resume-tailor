export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { sendError } from '@/helpers/endpoint';
import {
  createBlacklistedCompany,
  createBlacklistedCompaniesBulk,
  getBlacklistedCompanies
} from '@/services/(endpoint)/company-blacklist/company-blacklist.controller';

export const GET = async () => {
  try {
    const companies = await getBlacklistedCompanies();
    return Response.json({ result: 'success', companies });
  } catch (error) {
    console.error('get-company-blacklist error:', error);
    return sendError(Response, { msg: error?.message || 'Failed to load blacklisted companies' });
  }
};

export const POST = async (req) => {
  try {
    const { companyName, bulkValue, userId } = await req.json();
    const normalizedBulkValue = String(bulkValue || '').trim();

    if (normalizedBulkValue) {
      const result = await createBlacklistedCompaniesBulk({
        bulkValue: normalizedBulkValue,
        createdByUserId: userId
      });

      return Response.json({ result: 'success', ...result });
    }

    const company = await createBlacklistedCompany({
      companyName,
      createdByUserId: userId
    });

    return Response.json({ result: 'success', company });
  } catch (error) {
    console.error('create-company-blacklist error:', error);
    return sendError(Response, { msg: error?.message || 'Failed to add blacklisted company' });
  }
};
