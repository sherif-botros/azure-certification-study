import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, effectiveHours } from '../src/lib/schedule.js';
import { STAGES } from '../src/lib/data.js';
import { addDays, weekday } from '../src/lib/dates.js';

const base = () => ({
  done: {},
  hours: {},
  eventDates: {},
  settings: {
    startDate: '2026-11-18', // a Wednesday
    hoursPerWeek: 10,
    studyDays: [1, 2, 3, 4, 5, 6],
    include: { setup: true, pl900: true, ab400: true, ab100: true },
    targetDates: { pl900: '', ab400: '', ab100: '' },
    levels: { csharp: 'strong', azure: 'strong', dataverse: 'new', powerapps: 'new', automate: 'some', copilot: 'new', d365: 'new', ai: 'some' },
  },
});

const TODAY = '2026-11-18';

test('every item in every stage has a unique id', () => {
  const ids = STAGES.flatMap((s) => s.items.map((i) => i.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('study days only: no item starts on a Sunday', () => {
  const plan = buildPlan(base(), STAGES, TODAY);
  for (const r of plan.flat) {
    if (r.start && !r.eventDate) assert.notEqual(weekday(r.start), 0, `${r.id} starts ${r.start}`);
  }
});

test('dates never go backwards through the path', () => {
  const plan = buildPlan(base(), STAGES, TODAY);
  let prev = '0000';
  for (const r of plan.flat) {
    assert.ok(r.start >= prev, `${r.id} ${r.start} < ${prev}`);
    prev = r.start;
  }
});

test('hours scheduled equal hours remaining, within rounding', () => {
  const st = base();
  const plan = buildPlan(st, STAGES, TODAY);
  const sum = plan.flat.filter((r) => r.type !== 'exam').reduce((a, r) => a + r.hours, 0);
  const left = plan.hoursLeft - plan.flat.filter((r) => r.type === 'exam').reduce((a, r) => a + r.hours, 0);
  assert.ok(Math.abs(sum - left) < 1e-6);
});

test('ticking an item moves later dates earlier', () => {
  const a = buildPlan(base(), STAGES, TODAY);
  const st = base();
  st.done['pl-d1'] = TODAY;
  const b = buildPlan(st, STAGES, TODAY);
  const last = (p) => p.flat.at(-1).end;
  assert.ok(last(b) <= last(a));
  assert.equal(b.doneCount, 1);
});

test('more hours per week finishes sooner', () => {
  const slow = buildPlan(base(), STAGES, TODAY);
  const st = base();
  st.settings.hoursPerWeek = 20;
  const fast = buildPlan(st, STAGES, TODAY);
  assert.ok(fast.finish < slow.finish);
});

test('a booked exam date overrides the projection and warns when too early', () => {
  const st = base();
  st.eventDates['pl-exam'] = '2026-11-20';
  const plan = buildPlan(st, STAGES, TODAY);
  const exam = plan.flat.find((r) => r.id === 'pl-exam');
  assert.equal(exam.end, '2026-11-20');
  assert.ok(exam.warn);
});

test('a target date earlier than the projection is flagged behind', () => {
  const st = base();
  st.settings.targetDates.pl900 = '2026-11-25';
  const plan = buildPlan(st, STAGES, TODAY);
  const pl = plan.stages.find((s) => s.id === 'pl900');
  assert.equal(pl.status, 'behind');
  assert.ok(pl.slipDays > 0);
});

test('excluding a stage removes it from the plan', () => {
  const st = base();
  st.settings.include.pl900 = false;
  const plan = buildPlan(st, STAGES, TODAY);
  assert.ok(!plan.stages.some((s) => s.id === 'pl900'));
});

test('familiarity scales hours, and an override wins', () => {
  const st = base();
  const item = STAGES.find((s) => s.id === 'ab400').items.find((i) => i.id === 'ab4-d3a'); // csharp, 8h
  assert.equal(effectiveHours(item, st), 4.75); // 8 * 0.6 = 4.8 -> nearest quarter hour
  st.hours['ab4-d3a'] = 3;
  assert.equal(effectiveHours(item, st), 3);
});

test('start date in the future delays the first item', () => {
  const st = base();
  st.settings.startDate = addDays(TODAY, 14);
  const plan = buildPlan(st, STAGES, TODAY);
  assert.ok(plan.flat[0].start >= addDays(TODAY, 14));
});

test('a fully complete plan has no next step', () => {
  const st = base();
  for (const s of STAGES) for (const i of s.items) st.done[i.id] = TODAY;
  const plan = buildPlan(st, STAGES, TODAY);
  assert.equal(plan.next, null);
  assert.equal(plan.percent, 100);
});
