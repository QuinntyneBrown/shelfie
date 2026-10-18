// Traces to: L2-020
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak, todayIn } from './streak.ts';

const TODAY = '2026-10-17';

test('Given chapters read on 5 days in a row ending today, then the streak is 5', () => {
  assert.equal(computeStreak(['2026-10-17', '2026-10-16', '2026-10-15', '2026-10-14', '2026-10-13'], TODAY), 5);
});

test('Given nothing read today or yesterday, then the streak is 0', () => {
  assert.equal(computeStreak(['2026-10-15', '2026-10-14'], TODAY), 0);
  assert.equal(computeStreak([], TODAY), 0);
});

test('Given nothing read today but something yesterday, then the streak keeps its value', () => {
  assert.equal(computeStreak(['2026-10-16', '2026-10-15', '2026-10-14'], TODAY), 3);
});

test('Given a gap, then only the days since the gap count, and several chapters on one day count once', () => {
  assert.equal(computeStreak(['2026-10-17', '2026-10-17', '2026-10-16', '2026-10-14'], TODAY), 2);
});

test('Given the same moment, then today depends on the household time zone', () => {
  const lateEvening = new Date('2026-10-17T03:30:00Z');
  assert.equal(todayIn('UTC', lateEvening), '2026-10-17');
  assert.equal(todayIn('America/Toronto', lateEvening), '2026-10-16');
});
