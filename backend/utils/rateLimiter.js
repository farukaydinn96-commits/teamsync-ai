const clientBuckets = new Map();
let dailyGlobalCount = 0;
let currentDay = new Date().toISOString().slice(0, 10);

export const MAX_AI_PER_MINUTE = 5;
export const MAX_AI_PER_DAY = 120;

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
    existingTasks.map((t) => String(t.title || '').trim().toLowerCase())
  );
  return candidateTitles.filter(
    (title) => !existingSet.has(String(title || '').trim().toLowerCase())
  );
};

export const verifyRolePermission = (username = '', action = '') => {
  const isTechLead = username === 'Faruk_Lead' || username.toLowerCase().includes('lead');
  if (action === 'plan_sprint' || action === 'reset_workspace') {
    return {
      allowed: isTechLead,
      role: isTechLead ? 'Tech Lead' : 'Developer',
      message: isTechLead
        ? 'Authorized'
        : 'RBAC Policy: Only Tech Lead (Faruk_Lead) can trigger automated sprint planning or workspace resets.'
    };
  }
  return { allowed: true, role: isTechLead ? 'Tech Lead' : 'Developer', message: 'Authorized' };
};
