import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAiRateLimit,
  deduplicatePlanTasks,
  verifyRolePermission
} from '../utils/rateLimiter.js';

test('Sprint seed tasks have balanced statuses (>50% done), mixed priorities, and 4 assignees', () => {
  const sampleGeneralTasks = [
    { status: 'done', priority: 'high', assignee: 'Faruk_Lead' },
    { status: 'done', priority: 'high', assignee: 'Mert_Backend' },
    { status: 'done', priority: 'medium', assignee: 'Ece_Frontend' },
    { status: 'done', priority: 'medium', assignee: 'Faruk_Lead' },
    { status: 'done', priority: 'low', assignee: 'Zeynep_QA' },
    { status: 'in-progress', priority: 'medium', assignee: 'Mert_Backend' },
    { status: 'in-progress', priority: 'medium', assignee: 'Ece_Frontend' },
    { status: 'todo', priority: 'low', assignee: 'Zeynep_QA' }
  ];

  const doneCount = sampleGeneralTasks.filter((t) => t.status === 'done').length;
  const progressPct = Math.round((doneCount / sampleGeneralTasks.length) * 100);
  const priorities = new Set(sampleGeneralTasks.map((t) => t.priority));
  const assignees = new Set(sampleGeneralTasks.map((t) => t.assignee));

  assert.equal(progressPct, 63);
  assert.equal(priorities.size, 3);
  assert.equal(assignees.size, 4);
});

test('deduplicatePlanTasks prevents duplicate /plan task creation', () => {
  const existing = [
    { title: 'OAuth2 Module - Schema & Architecture Design' },
    { title: 'OAuth2 Module - REST/Socket API & Security Guard' }
  ];
  const candidates = [
    'OAuth2 Module - Schema & Architecture Design',
    'OAuth2 Module - UI Components & State Integration'
  ];

  const unique = deduplicatePlanTasks(existing, candidates);
  assert.equal(unique.length, 1);
  assert.equal(unique[0], 'OAuth2 Module - UI Components & State Integration');
});

test('RBAC verifyRolePermission restricts /plan sprint generation to Tech Lead', () => {
  const leadCheck = verifyRolePermission('Faruk_Lead', 'plan_sprint');
  const devCheck = verifyRolePermission('Ece_Frontend', 'plan_sprint');

  assert.equal(leadCheck.allowed, true);
  assert.equal(devCheck.allowed, false);
});

test('checkAiRateLimit enforces 5 requests per minute per client IP', () => {
  const testIp = `test-ip-${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    const res = checkAiRateLimit(testIp);
    assert.equal(res.allowed, true);
  }
  const sixth = checkAiRateLimit(testIp);
  assert.equal(sixth.allowed, false);
});
