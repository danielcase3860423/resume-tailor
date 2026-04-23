export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { decodedToken, sendError } from '@/helpers/endpoint';
import { getDashboardSummary } from '@/services/(endpoint)/dashboard/dashboard.controller';

export const GET = async (req) => {
  try {
    const token = decodedToken(req);
    const url = new URL(req.url, `http://${req.headers.host}`);
    const params = new URLSearchParams(url.search);

    const preset = params.get('preset') || 'this_month';
    const startDate = params.get('startDate') || '';
    const endDate = params.get('endDate') || '';

    if (!token?.uuid) {
      return sendError(Response, { code: 401, msg: 'Unauthorized' });
    }

    const summary = await getDashboardSummary({
      userId: token.uuid,
      preset,
      startDate,
      endDate
    });

    return Response.json({
      result: 'success',
      ...summary
    });
  } catch (err) {
    console.error('dashboard-summary error:', err);
    return sendError(Response, { msg: err?.message || 'Failed to load dashboard summary' });
  }
};
