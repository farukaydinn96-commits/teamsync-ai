const clientBuckets = new Map();
let dailyGlobalCount = 0;
let currentDay = new Date().toISOString().slice(0, 10);

export const MAX_AI_PER_MINUTE = 5;
export const MAX_AI_PER_DAY = 120;

export const extractClientIp = (forwardedHeader, fallbackAddress = 'anonymous') => {
  if (typeof forwardedHeader === 'string' && forwardedHeader.trim().length > 0) {
    const parts = forwardedHeader
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }
  return fallbackAddress || 'anonymous';
};

export const cleanupExpiredBuckets = (now = Date.now()) => {
  const windowStart = now - 60_000;
  for (const [key, timestamps] of clientBuckets.entries()) {
    const active = timestamps.filter((ts) => ts > windowStart);
    if (active.length === 0) {
      clientBuckets.delete(key);
    } else {
      clientBuckets.set(key, active);
    }
  }
};

const cleanupTimer = setInterval(() => cleanupExpiredBuckets(), 60_000);
if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

export const checkAiRateLimit = (clientId = 'anonymous') => {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentDay) {
    currentDay = today;
    dailyGlobalCount = 0;
  }

  if (dailyGlobalCount >= MAX_AI_PER_DAY) {
    return {
      allowed: false,
      reason: 'Daily global AI quota reached (120 req/day). Using deterministic fallback template.'
    };
  }

  const now = Date.now();
  const windowStart = now - 60_000;
  const history = (clientBuckets.get(clientId) || []).filter((ts) => ts > windowStart);

  if (history.length >= MAX_AI_PER_MINUTE) {
    return {
      allowed: false,
      reason: `Rate limit exceeded (${MAX_AI_PER_MINUTE} AI requests/min per IP). Please wait a moment.`
    };
  }

  history.push(now);
  clientBuckets.set(clientId, history);
  dailyGlobalCount += 1;

  return {
    allowed: true,
    remainingMinute: MAX_AI_PER_MINUTE - history.length,
    remainingDay: MAX_AI_PER_DAY - dailyGlobalCount
  };
};

export const deduplicatePlanTasks = (existingTasks = [], candidateTitles = []) => {
  const existingSet = new Set(
    existingTasks.map((t) => String(t.title || '').trim().toLowerCase().replace(/\s+/g, ' '))
  );
  const seenCandidates = new Set();
  return candidateTitles.filter((title) => {
    const norm = String(title || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!norm || existingSet.has(norm) || seenCandidates.has(norm)) return false;
    seenCandidates.add(norm);
    return true;
  });
};
