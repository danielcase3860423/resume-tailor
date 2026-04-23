import dbConnect from '@/mongodb';
import { getResumeModels } from '@/mongodb-resume';
import profileModel from '@/models/profile.model';
import userModel from '@/models/user.model';
import { CONSTANT_USER_ROLE_ADMIN, CONSTANT_USER_ROLE_USER } from '@/config/constants';
import { getActiveUserById } from '@/services/(endpoint)/users/user.controller';

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toLocalDate(value) {
  if (value instanceof Date) {
    return new Date(value);
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  return new Date(value);
}

function startOfDay(date) {
  const value = toLocalDate(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = toLocalDate(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function shiftDays(date, delta) {
  const value = toLocalDate(date);
  value.setDate(value.getDate() + delta);
  return value;
}

function toDateKey(date) {
  const value = toLocalDate(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDisplayDate(date) {
  const value = toLocalDate(date);
  return `${String(value.getMonth() + 1).padStart(2, '0')}/${String(value.getDate()).padStart(2, '0')}`;
}

function resolveDateRange({ preset = 'this_month', startDate, endDate }) {
  const now = new Date();

  if (startDate && endDate) {
    return {
      preset: 'custom',
      start: startOfDay(startDate),
      end: endOfDay(endDate)
    };
  }

  if (preset === 'last_7_days') {
    return {
      preset,
      start: startOfDay(shiftDays(now, -6)),
      end: endOfDay(now)
    };
  }

  if (preset === 'last_30_days') {
    return {
      preset,
      start: startOfDay(shiftDays(now, -29)),
      end: endOfDay(now)
    };
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    preset: 'this_month',
    start: startOfDay(monthStart),
    end: endOfDay(now)
  };
}

function buildDailyColumns(rangeStart, rangeEnd) {
  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);

  return Array.from({ length: days }, (_, index) => {
    const date = shiftDays(end, -index);
    return {
      key: toDateKey(date),
      label: toDisplayDate(date)
    };
  });
}

function formatAverage(value, denominator) {
  if (!denominator) {
    return 0;
  }

  return Number((value / denominator).toFixed(1));
}

function buildEmptyDailyCounts(columns) {
  return columns.reduce((accumulator, column) => {
    accumulator[column.key] = 0;
    return accumulator;
  }, {});
}

function getTopEntryName(counterMap, fallback = 'N/A') {
  const entries = [...counterMap.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  return entries[0]?.[0] || fallback;
}

function sortRows(rows) {
  return rows.sort((left, right) => {
    if (right.total !== left.total) {
      return right.total - left.total;
    }

    return left.label.localeCompare(right.label);
  });
}

export async function getDashboardSummary({ userId, preset, startDate, endDate }) {
  const currentUser = await getActiveUserById(userId);

  if (![CONSTANT_USER_ROLE_ADMIN, CONSTANT_USER_ROLE_USER].includes(currentUser.role)) {
    throw new Error('Dashboard is available only for admin and VA users');
  }

  const range = resolveDateRange({ preset, startDate, endDate });
  const dailyColumns = buildDailyColumns(range.start, range.end);
  const dailyColumnKeys = new Set(dailyColumns.map((column) => column.key));

  await dbConnect();

  const [resumeTargets, users, profiles] = await Promise.all([
    getResumeModels(),
    userModel.find({}, { username: 1, role: 1, status: 1 }).lean(),
    profileModel.find({}, { profileName: 1, profileTitle: 1 }).lean()
  ]);

  const resumeFilter = {
    created_at: {
      $gte: range.start,
      $lte: range.end
    }
  };

  if (currentUser.role === CONSTANT_USER_ROLE_USER) {
    resumeFilter.associatedUserId = currentUser._id;
  }

  const resumeDocs = (
    await Promise.all(
      resumeTargets.map(async ({ model }) =>
        model
          .find(resumeFilter, {
            associatedUserId: 1,
            associatedProfileId: 1,
            companyName: 1,
            jobTitle: 1,
            created_at: 1
          })
          .lean()
      )
    )
  ).flat();

  const userById = new Map(users.map((user) => [String(user._id), user]));
  const profileById = new Map(profiles.map((profile) => [String(profile._id), profile]));

  const totalRangeDays = Math.max(1, Math.round((endOfDay(range.end) - startOfDay(range.start)) / 86400000) + 1);
  const todayKey = toDateKey(new Date());
  const uniqueAssistantIds = new Set();
  const uniqueProfileIds = new Set();
  const companyCounts = new Map();
  const assistantBuckets = new Map();
  const profileBuckets = new Map();

  for (const resume of resumeDocs) {
    const createdAt = new Date(resume.created_at);
    const dayKey = toDateKey(createdAt);
    const associatedUserId = resume.associatedUserId ? String(resume.associatedUserId) : '';
    const associatedProfileId = resume.associatedProfileId ? String(resume.associatedProfileId) : '';
    const assistant = userById.get(associatedUserId);
    const profile = profileById.get(associatedProfileId);
    const assistantName = cleanString(assistant?.username) || 'Unassigned';
    const profileName = cleanString(profile?.profileName) || cleanString(profile?.profileTitle) || 'Unknown Profile';
    const companyName = cleanString(resume.companyName) || 'Client unspecified';

    if (associatedUserId) {
      uniqueAssistantIds.add(associatedUserId);
    }
    if (associatedProfileId) {
      uniqueProfileIds.add(associatedProfileId);
    }
    companyCounts.set(companyName, (companyCounts.get(companyName) || 0) + 1);

    if (currentUser.role === CONSTANT_USER_ROLE_ADMIN) {
      const assistantKey = associatedUserId || 'unassigned';
      if (!assistantBuckets.has(assistantKey)) {
        assistantBuckets.set(assistantKey, {
          key: assistantKey,
          label: assistantName,
          topLabel: new Map(),
          dailyCounts: buildEmptyDailyCounts(dailyColumns),
          total: 0,
          activeDays: new Set()
        });
      }

      const bucket = assistantBuckets.get(assistantKey);
      bucket.total += 1;
      bucket.activeDays.add(dayKey);
      bucket.topLabel.set(profileName, (bucket.topLabel.get(profileName) || 0) + 1);
      if (dailyColumnKeys.has(dayKey)) {
        bucket.dailyCounts[dayKey] += 1;
      }
    }

    const profileKey = associatedProfileId || `fallback:${profileName}`;
    if (!profileBuckets.has(profileKey)) {
      profileBuckets.set(profileKey, {
        key: profileKey,
        label: profileName,
        topLabel: new Map(),
        dailyCounts: buildEmptyDailyCounts(dailyColumns),
        total: 0,
        activeDays: new Set()
      });
    }

    const profileBucket = profileBuckets.get(profileKey);
    profileBucket.total += 1;
    profileBucket.activeDays.add(dayKey);
    profileBucket.topLabel.set(companyName, (profileBucket.topLabel.get(companyName) || 0) + 1);
    if (dailyColumnKeys.has(dayKey)) {
      profileBucket.dailyCounts[dayKey] += 1;
    }
  }

  const adminRows = sortRows(
    [...assistantBuckets.values()].map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      secondaryLabel: getTopEntryName(bucket.topLabel, 'N/A'),
      total: bucket.total,
      average: formatAverage(bucket.total, totalRangeDays),
      activeDays: bucket.activeDays.size,
      todayCount: bucket.dailyCounts[todayKey] || 0,
      dailyCounts: dailyColumns.map((column) => ({ key: column.key, label: column.label, count: bucket.dailyCounts[column.key] || 0 }))
    }))
  );

  const profileRows = sortRows(
    [...profileBuckets.values()].map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      secondaryLabel: getTopEntryName(bucket.topLabel, 'N/A'),
      total: bucket.total,
      average: formatAverage(bucket.total, totalRangeDays),
      activeDays: bucket.activeDays.size,
      todayCount: bucket.dailyCounts[todayKey] || 0,
      dailyCounts: dailyColumns.map((column) => ({ key: column.key, label: column.label, count: bucket.dailyCounts[column.key] || 0 }))
    }))
  );

  const topCompanies = [...companyCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  const overview = {
    totalResumes: resumeDocs.length,
    resumesToday: resumeDocs.filter((resume) => toDateKey(resume.created_at) === todayKey).length,
    activeAssistants: uniqueAssistantIds.size,
    activeProfiles: uniqueProfileIds.size,
    averagePerDay: formatAverage(resumeDocs.length, totalRangeDays)
  };

  return {
    role: currentUser.role,
    range: {
      preset: range.preset,
      startDate: toDateKey(range.start),
      endDate: toDateKey(range.end),
      totalDays: totalRangeDays,
      dailyColumns
    },
    overview,
    adminRows,
    profileRows,
    topCompanies
  };
}
