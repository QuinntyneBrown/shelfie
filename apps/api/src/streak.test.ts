// Traces to: L2-020, L2-161, L2-162, L2-163
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak, computeWeek, mondayOf, todayIn } from './streak.ts';

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

test('Given a Friday with reading Monday to Friday, then the week runs Monday to Sunday with those five days read and Friday as today', () => {
  // 2026-10-16 is a Friday.
  const week = computeWeek(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-09'], '2026-10-16');
  assert.deepEqual(
    week.map((d) => [d.date, d.read, d.today]),
    [
      ['2026-10-12', true, false],
      ['2026-10-13', true, false],
      ['2026-10-14', true, false],
      ['2026-10-15', true, false],
      ['2026-10-16', true, true],
      ['2026-10-17', false, false],
      ['2026-10-18', false, false],
    ],
  );
});

test('Given today is a Sunday, then the week still starts on the Monday before it', () => {
  const week = computeWeek(['2026-10-18'], '2026-10-18');
  assert.equal(week[0]!.date, '2026-10-12');
  assert.deepEqual(week[6], { date: '2026-10-18', read: true, healed: null, today: true });
});

const BROTHER = '10 minutes reading with your brother';

test('Given a healed Wednesday with no chapter, then the week marks it healed with its activity, and not read', () => {
  // 2026-10-14 is a Wednesday.
  const week = computeWeek(['2026-10-12', '2026-10-13', '2026-10-15', '2026-10-16'], '2026-10-16', [{ day: '2026-10-14', activity: BROTHER }]);
  assert.deepEqual(
    week.map((d) => [d.date, d.read, d.healed]),
    [
      ['2026-10-12', true, null],
      ['2026-10-13', true, null],
      ['2026-10-14', false, BROTHER],
      ['2026-10-15', true, null],
      ['2026-10-16', true, null],
      ['2026-10-17', false, null],
      ['2026-10-18', false, null],
    ],
  );
});

test('Given a healed day on which a chapter was later logged, then the week shows it as read, not healed', () => {
  const week = computeWeek(['2026-10-14'], '2026-10-16', [{ day: '2026-10-14', activity: BROTHER }]);
  assert.deepEqual([week[2]!.read, week[2]!.healed], [true, null]);
});

test('Given any day of a week, then its Monday is the Monday on or before it', () => {
  assert.equal(mondayOf('2026-10-12'), '2026-10-12');
  assert.equal(mondayOf('2026-10-14'), '2026-10-12');
  assert.equal(mondayOf('2026-10-18'), '2026-10-12');
  assert.equal(mondayOf('2026-10-19'), '2026-10-19');
});
