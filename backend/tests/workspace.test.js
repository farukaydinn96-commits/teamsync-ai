import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAiRateLimit,
  deduplicatePlanTasks,
  cleanupExpiredBuckets
} from '../utils/rateLimiter.js';
import {
  signDemoToken,
  workspaceGuard,
  verifySocketAction
} from '../middleware/workspaceGuard.js';
import {
  roomSchema,
  taskPayloadSchema,
  docPayloadSchema
} from '../utils/validators.js';

const createMockRes = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  }
});

test('1. RBAC 401: workspaceGuard rejects missing or forged x-workspace-role header without signed JWT', () => {
  const guard = workspaceGuard(['Tech Lead']);
  const reqForged = { headers: { 'x-workspace-role': 'Tech Lead' } };
  const res = createMockRes();
  let nextCalled = false;

  guard(reqForged, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, 'Invalid or missing token');
});

test('2. RBAC 403: workspaceGuard rejects valid signed JWT when role claim is Developer instead of Tech Lead', () => {
  const guard = workspaceGuard(['Tech Lead']);
  const devToken = signDemoToken({ username: 'Ece_Frontend', role: 'Developer' });
  const req = { headers: { authorization: `Bearer ${devToken}` } };
  const res = createMockRes();
  let nextCalled = false;

  guard(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'RBAC: Insufficient permissions');
});

test('3. RBAC 200: workspaceGuard & verifySocketAction authorize valid signed Tech Lead JWT', () => {
  const guard = workspaceGuard(['Tech Lead']);
  const leadToken = signDemoToken({ username: 'Faruk_Lead', role: 'Tech Lead' });
  const req = { headers: { authorization: `Bearer ${leadToken}` } };
  const res = createMockRes();
  let nextCalled = false;

  guard(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.role, 'Tech Lead');

  const socketCheck = verifySocketAction(leadToken, ['Tech Lead']);
  assert.equal(socketCheck.allowed, true);
  assert.equal(socketCheck.statusCode, 200);
});

test('4. Duplicate prevention: deduplicatePlanTasks filters case-insensitive and whitespace duplicates', () => {
  const existing = [{ title: 'OAuth2 Module - Schema & Architecture Design' }];
  const candidates = [
    '  oauth2 module - schema & architecture design  ',
    'OAuth2 Module - Automated Integration Tests',
    'OAuth2 Module - Automated Integration Tests'
  ];

  const unique = deduplicatePlanTasks(existing, candidates);
  assert.equal(unique.length, 1);
  assert.equal(unique[0], 'OAuth2 Module - Automated Integration Tests');
});

test('5. Rate Limiter: allows 5 requests/min per IP, blocks the 6th, and cleans up expired buckets', () => {
  const ip = `client-ip-${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    assert.equal(checkAiRateLimit(ip).allowed, true);
  }
  const sixth = checkAiRateLimit(ip);
  assert.equal(sixth.allowed, false);

  cleanupExpiredBuckets(Date.now() + 61_000);
  assert.equal(checkAiRateLimit(ip).allowed, true);
});

test('6. Socket.io Room Isolation & Zod Input Validation: accepts session-scoped rooms and blocks injection', () => {
  assert.equal(roomSchema.safeParse('sess_ab12cd:general').success, true);
  assert.equal(roomSchema.safeParse('general').success, true);
  assert.equal(roomSchema.safeParse('unauthorized_secret_room').success, false);
  assert.equal(roomSchema.safeParse({ $gt: '' }).success, false);

  const validTask = taskPayloadSchema.safeParse({
    room: 'sess_ab12cd:development',
    title: 'Implement Zod validation',
    priority: 'high'
  });
  assert.equal(validTask.success, true);

  const oversizedDoc = docPayloadSchema.safeParse({
    room: 'general',
    content: 'x'.repeat(55000)
  });
  assert.equal(oversizedDoc.success, false);
});
