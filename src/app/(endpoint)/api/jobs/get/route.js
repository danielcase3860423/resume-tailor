export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { sendError } from '@/helpers/endpoint';
import { getJobs } from '@/services/(endpoint)/jobs/job.controller';

export const GET = async (req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const params = new URLSearchParams(url.search); // Parse query parameters
  // Get page and limit from URL, with defaults if not provided
  const page = parseInt(params.get('page') || 1, 10); // Default to 1 if not set
  const limit = parseInt(params.get('limit') || 20, 10); // Default to 20 if not set
  const company = params.get('company');
  const title = params.get('title');
  const extension = params.get('extension');
  
  console.log('Page:', page, 'Limit:', limit); // Debugging query params
  try {
    const skip = (page - 1) * limit;
    const { jobs, total } = await getJobs({ skip, limit, company, title, extension });
    return Response.json({ result: 'success', jobs, total });
  } catch (err) {
    console.error('get-jobs error:', err);
    return sendError(Response, { msg: 'Failed to fetch jobs' });
  }
};
