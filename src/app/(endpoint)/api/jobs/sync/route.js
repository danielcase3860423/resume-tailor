export const dynamic = 'force-dynamic';
export const revalidate = 0;

import dbConnect from '@/mongodb';
import { decodedToken, sendError } from '@/helpers/endpoint';
import { CONSTANT_USER_ROLE_ADMIN, ERROR_FAILED, ERROR_SUCCESS } from '@/config/constants';
import jobModel from '@/models/job.model';
import atsBoards from '@/config/ats_boards.json';
import { getActiveUserById } from '@/services/(endpoint)/users/user.controller';
const { getJson } = require('serpapi');

const BOARD_SCAN_LIMIT = 160;
const BOARD_BATCH_SIZE = 8;
const TARGET_JOB_COUNT = 40;
const SERP_PAGE_LIMIT = 4;

function titleCaseSlug(value = '') {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeWhitespace(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRelativePostedLabel(dateValue) {
  const date = dateValue ? new Date(dateValue) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / 86400000));
  if (diffDays === 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return '1 day ago';
  }

  return `${diffDays} days ago`;
}

function isSeniorSoftwareEngineerTitle(title = '') {
  const normalizedTitle = normalizeWhitespace(title).toLowerCase();
  if (!normalizedTitle) {
    return false;
  }

  const seniorityPattern = /\b(senior|staff|principal|lead|sr\.?)\b/i;
  const rolePattern =
    /\b(software engineer|software developer|full[-\s]?stack engineer|backend engineer|back[-\s]?end engineer|frontend engineer|front[-\s]?end engineer|platform engineer|application engineer|mobile engineer|ios engineer|android engineer|web engineer)\b/i;

  return seniorityPattern.test(normalizedTitle) && rolePattern.test(normalizedTitle);
}

function isUsRemoteLocation(locationValue = '') {
  const normalizedLocation = normalizeWhitespace(locationValue).toLowerCase();
  if (!normalizedLocation) {
    return false;
  }

  const remotePattern = /\b(remote|work from home|wfh)\b/i;
  const usPattern = /\b(us|u\.s\.|usa|united states|united states of america)\b/i;
  return remotePattern.test(normalizedLocation) && (usPattern.test(normalizedLocation) || normalizedLocation === 'remote');
}

function buildBoardWindow(boards) {
  if (!Array.isArray(boards) || !boards.length) {
    return [];
  }

  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((today - yearStart) / 86400000);
  const startIndex = dayOfYear % boards.length;
  const rotated = [...boards.slice(startIndex), ...boards.slice(0, startIndex)];
  return rotated.slice(0, BOARD_SCAN_LIMIT);
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      signal: controller.signal,
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function serpRequest(params) {
  const serpKeys = String(process.env.SERP_KEYS || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);

  if (!serpKeys.length) {
    return { jobs_results: [] };
  }

  for (const key of serpKeys) {
    try {
      return await getJson({ ...params, api_key: key });
    } catch (err) {
      const msg = err?.message || '';
      const isCreditError = msg.includes('exceeded') || msg.includes('limit') || msg.includes('billing') || msg.includes('quota');

      if (isCreditError) {
        console.warn(`SerpAPI key exhausted: ${key}`);
        continue;
      }

      throw err;
    }
  }

  return { jobs_results: [] };
}

async function fetchGreenhouseBoardJobs(board) {
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs`);
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

  return jobs
    .filter((job) => isSeniorSoftwareEngineerTitle(job?.title) && isUsRemoteLocation(job?.location?.name))
    .map((job) => {
      const location = normalizeWhitespace(job?.location?.name || '');
      const postedLabel = buildRelativePostedLabel(job?.updated_at);
      const extensions = [postedLabel, location].filter(Boolean).join(', ');
      const absoluteUrl = normalizeWhitespace(job?.absolute_url || '');

      return {
        job_id: `greenhouse:${board.token}:${job?.id || job?.internal_job_id || absoluteUrl}`,
        title: normalizeWhitespace(job?.title || ''),
        company_name: titleCaseSlug(board.companySlug),
        location,
        job_url: absoluteUrl,
        apply_options: absoluteUrl ? [{ title: 'Apply', link: absoluteUrl }] : [],
        extensions,
        source_type: 'greenhouse',
        board_token: board.token,
        posted_at: job?.updated_at ? new Date(job.updated_at) : null
      };
    });
}

async function fetchAshbyBoardJobs(board) {
  const data = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${board.token}`);
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

  return jobs
    .filter((job) => {
      const location = normalizeWhitespace(
        job?.location ||
          job?.address?.postalAddress?.addressCountry ||
          job?.secondaryLocations?.map((entry) => entry?.location).filter(Boolean).join(', ')
      );
      const isRemote = job?.workplaceType === 'Remote' || Boolean(job?.isRemote);
      return isSeniorSoftwareEngineerTitle(job?.title) && isRemote && isUsRemoteLocation(location || 'Remote US');
    })
    .map((job) => {
      const location = normalizeWhitespace(job?.location || '');
      const postedLabel = buildRelativePostedLabel(job?.publishedAt);
      const employmentType = normalizeWhitespace(job?.employmentType || '');
      const extensions = [postedLabel, location, employmentType].filter(Boolean).join(', ');
      const applyUrl = normalizeWhitespace(job?.applyUrl || job?.jobUrl || '');

      return {
        job_id: `ashby:${board.token}:${job?.jobUrl || job?.applyUrl || job?.title}`,
        title: normalizeWhitespace(job?.title || ''),
        company_name: titleCaseSlug(board.companySlug),
        location,
        job_url: normalizeWhitespace(job?.jobUrl || applyUrl),
        apply_options: applyUrl ? [{ title: 'Apply', link: applyUrl }] : [],
        extensions,
        source_type: 'ashby',
        board_token: board.token,
        posted_at: job?.publishedAt ? new Date(job.publishedAt) : null
      };
    });
}

async function fetchBoardJobs(board) {
  if (board.monitorType === 'greenhouse') {
    return fetchGreenhouseBoardJobs(board);
  }

  if (board.monitorType === 'ashby') {
    return fetchAshbyBoardJobs(board);
  }

  return [];
}

function filterByKeyword(jobs, keywords = '') {
  const normalized = normalizeWhitespace(keywords).toLowerCase();
  if (!normalized) {
    return jobs;
  }

  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && !['latest', 'usa', 'us', 'remote'].includes(token));

  if (!tokens.length) {
    return jobs;
  }

  return jobs.filter((job) => {
    const haystack = `${job.title} ${job.company_name} ${job.location} ${job.extensions}`.toLowerCase();
    return tokens.every((token) => new RegExp(`\\b${escapeRegExp(token)}`).test(haystack));
  });
}

async function fetchSerpJobs(keywords = '') {
  const searchQuery = normalizeWhitespace(keywords) || 'Senior Software Engineer Remote USA';
  const collectedJobs = [];
  let nextPageToken = null;
  let page = 0;

  while (page < SERP_PAGE_LIMIT) {
    const params = {
      engine: 'google_jobs',
      q: searchQuery
    };

    if (nextPageToken) {
      params.next_page_token = nextPageToken;
    }

    const result = await serpRequest(params);
    const jobs = Array.isArray(result?.jobs_results) ? result.jobs_results : [];

    for (const job of jobs) {
      const title = normalizeWhitespace(job?.title || '');
      const location = normalizeWhitespace(job?.location || '');
      const detectedValues = Object.entries(job?.detected_extensions || {}).map(([key, value]) => {
        if (typeof value === 'boolean' && value === true) {
          return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
        }

        return value;
      });
      const mergedExtensions = [...detectedValues, ...(Array.isArray(job?.extensions) ? job.extensions.map((value) => String(value)) : [])]
        .filter(Boolean)
        .join(', ');

      if (!isSeniorSoftwareEngineerTitle(title) || !isUsRemoteLocation(`${location} ${mergedExtensions}`)) {
        continue;
      }

      const applyOptions = Array.isArray(job?.apply_options) ? job.apply_options : [];
      const primaryApplyLink = normalizeWhitespace(applyOptions.find((option) => option?.link)?.link || '');

      collectedJobs.push({
        job_id: `serp:${job?.job_id || `${title}:${location}:${primaryApplyLink}`}`,
        title,
        company_name: normalizeWhitespace(job?.company_name || ''),
        location,
        job_url: primaryApplyLink,
        apply_options: applyOptions,
        extensions: mergedExtensions,
        source_type: 'serp',
        board_token: '',
        posted_at: null
      });

      if (collectedJobs.length >= TARGET_JOB_COUNT) {
        return collectedJobs;
      }
    }

    nextPageToken = result?.serpapi_pagination?.next_page_token || null;
    if (!nextPageToken) {
      break;
    }

    page += 1;
  }

  return collectedJobs;
}

export const GET = async (req) => {
  try {
    await dbConnect();

    const token = decodedToken(req);
    const userId = token.uuid;
    const adminUser = await getActiveUserById(userId);

    if (adminUser.role !== CONSTANT_USER_ROLE_ADMIN) {
      return Response.json({ result: ERROR_FAILED, msg: 'Failed to fetch jobs' });
    }

    const keywords = req.nextUrl.searchParams.get('keywords') || '';
    const boardsToScan = buildBoardWindow(atsBoards);
    const collectedJobs = [];
    let scannedBoards = 0;

    const serpJobs = await fetchSerpJobs(keywords);
    for (const serpJob of serpJobs) {
      if (!collectedJobs.some((existingJob) => existingJob.job_id === serpJob.job_id)) {
        collectedJobs.push(serpJob);
      }
    }

    for (let index = 0; index < boardsToScan.length; index += BOARD_BATCH_SIZE) {
      const currentBatch = boardsToScan.slice(index, index + BOARD_BATCH_SIZE);
      const batchResults = await Promise.allSettled(currentBatch.map((board) => fetchBoardJobs(board)));

      for (const batchResult of batchResults) {
        scannedBoards += 1;
        if (batchResult.status !== 'fulfilled') {
          continue;
        }

        for (const job of filterByKeyword(batchResult.value, keywords)) {
          if (!job.job_id) {
            continue;
          }

          if (!collectedJobs.some((existingJob) => existingJob.job_id === job.job_id)) {
            collectedJobs.push(job);
          }

          if (collectedJobs.length >= TARGET_JOB_COUNT) {
            break;
          }
        }

        if (collectedJobs.length >= TARGET_JOB_COUNT) {
          break;
        }
      }

      if (collectedJobs.length >= TARGET_JOB_COUNT) {
        break;
      }
    }

    if (collectedJobs.length) {
      await jobModel.bulkWrite(
        collectedJobs.map((job) => ({
          updateOne: {
            filter: { job_id: job.job_id },
            update: {
              $set: job
            },
            upsert: true
          }
        })),
        { ordered: false }
      );
    }

    const serpCount = collectedJobs.filter((job) => job.source_type === 'serp').length;
    const atsCount = collectedJobs.length - serpCount;

    return Response.json({
      result: ERROR_SUCCESS,
      msg: `Fetched ${collectedJobs.length} jobs (${serpCount} Serp Google Jobs, ${atsCount} Greenhouse/Ashby) after scanning ${scannedBoards} ATS boards.`
    });
  } catch (err) {
    console.error(err);
    return sendError(Response, { msg: err?.message || 'Failed to fetch jobs' });
  }
};
