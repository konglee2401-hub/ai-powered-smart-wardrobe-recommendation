import UsageSnapshot from '../models/UsageSnapshot.js';

export function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getUsageSnapshot(userId) {
  const dateKey = getTodayKey();
  let snapshot = await UsageSnapshot.findOne({ user: userId, dateKey });
  if (!snapshot) {
    snapshot = await UsageSnapshot.create({ user: userId, dateKey });
  }
  return snapshot;
}

export function resolveLimitValue(limit) {
  if (limit === null || limit === undefined) return null;
  if (Number.isNaN(Number(limit))) return null;
  return Number(limit);
}

export async function checkAndConsumeGeneration(userId, type, amount, planLimits = {}) {
  const limitValue = resolveLimitValue(planLimits?.generationDaily?.[type]);
  if (limitValue === null) {
    return { allowed: true, limit: null };
  }

  const snapshot = await getUsageSnapshot(userId);
  const current = snapshot.generation?.[type] || 0;
  if (limitValue >= 0 && current + amount > limitValue) {
    return { allowed: false, limit: limitValue, used: current };
  }

  snapshot.generation[type] = current + amount;
  await snapshot.save();
  return { allowed: true, limit: limitValue, used: snapshot.generation[type] };
}

export async function checkAndConsumeScrape(userId, { runs = 1, videos = 0 }, planLimits = {}) {
  const maxPerDay = resolveLimitValue(planLimits?.scrape?.maxPerDay);
  const maxPerRun = resolveLimitValue(planLimits?.scrape?.maxPerRun);

  if (maxPerRun !== null && videos > maxPerRun) {
    return { allowed: false, reason: 'max_per_run', limit: maxPerRun };
  }

  if (maxPerDay !== null) {
    const snapshot = await getUsageSnapshot(userId);
    const current = snapshot.scrape?.runs || 0;
    if (current + runs > maxPerDay) {
      return { allowed: false, reason: 'max_per_day', limit: maxPerDay, used: current };
    }
    snapshot.scrape.runs = current + runs;
    snapshot.scrape.videos = (snapshot.scrape.videos || 0) + videos;
    await snapshot.save();
  }

  return { allowed: true };
}
