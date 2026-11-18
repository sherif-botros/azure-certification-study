// Schedule engine: turns remaining checklist items into dated work, given hours per week and study days.

import { addDays, diffDays, maxISO, nextStudyDay } from './dates.js';

export const LEVEL_FACTOR = { new: 1, some: 0.85, strong: 0.6 };

export function effectiveHours(item, st) {
  const o = st.hours?.[item.id];
  if (o !== undefined && o !== null && o !== '' && !Number.isNaN(Number(o))) return Math.max(0, Number(o));
  if (!item.hours) return 0;
  const lvl = st.settings.levels?.[item.area];
  const f = LEVEL_FACTOR[lvl] ?? 1;
  return Math.max(0.25, Math.round(item.hours * f * 4) / 4);
}

export function buildPlan(st, stages, today) {
  const s = st.settings;
  const days = s.studyDays?.length ? [...s.studyDays].sort() : [1, 2, 3, 4, 5];
  const hpw = Number(s.hoursPerWeek) > 0 ? Number(s.hoursPerWeek) : 10;
  const perDay = Math.max(0.25, hpw / days.length);

  let cursor = nextStudyDay(maxISO(today, s.startDate || today), days);
  let cap = perDay;
  let lastEnd = addDays(cursor, -1);

  const flat = [];
  const outStages = [];

  for (const stage of stages) {
    if (!stage.items || s.include?.[stage.id] === false) continue;
    const out = { ...stage, items: [], hoursTotal: 0, hoursLeft: 0, doneCount: 0, finish: null, projectedExam: null };

    for (const it of stage.items) {
      const done = !!st.done?.[it.id];
      const hours = effectiveHours(it, st);
      const eventDate = st.eventDates?.[it.id] || '';
      const row = { ...it, stageId: stage.id, hours, done, doneAt: st.done?.[it.id] || null, eventDate, start: null, end: null, warn: null };
      out.hoursTotal += hours;

      if (done) {
        out.doneCount++;
      } else {
        out.hoursLeft += hours;
        if (it.type === 'exam') {
          const natural = nextStudyDay(addDays(lastEnd, 1), days);
          const date = eventDate || natural;
          if (eventDate && eventDate < natural) row.warn = `Booked before your projected study finish (${natural}).`;
          row.start = row.end = date;
          out.projectedExam = date;
          cursor = nextStudyDay(addDays(date, 1), days);
          cap = perDay;
          lastEnd = date;
        } else if (it.type === 'event' && eventDate) {
          row.start = row.end = eventDate;
        } else {
          let h = hours;
          if (h <= 0) {
            row.start = row.end = cursor;
          } else {
            let first = true;
            while (h > 1e-9) {
              if (first) {
                row.start = cursor;
                first = false;
              }
              const take = Math.min(h, cap);
              h -= take;
              cap -= take;
              row.end = cursor;
              if (cap < 1e-9) {
                cursor = nextStudyDay(addDays(cursor, 1), days);
                cap = perDay;
              }
            }
          }
          lastEnd = row.end;
        }
        if (row.end && (!out.finish || row.end > out.finish)) out.finish = row.end;
      }
      out.items.push(row);
      flat.push(row);
    }

    const total = out.items.length;
    out.total = total;
    out.complete = total > 0 && out.doneCount === total;
    out.percent = total ? Math.round((out.doneCount / total) * 100) : 0;

    const target = s.targetDates?.[stage.id] || '';
    out.targetDate = target;
    if (out.complete) out.status = 'complete';
    else if (target && out.projectedExam) {
      const gap = diffDays(target, out.projectedExam);
      out.slipDays = gap;
      out.status = gap > 0 ? 'behind' : 'on-track';
    } else out.status = 'no-target';

    outStages.push(out);
  }

  const next = flat.find((r) => !r.done) || null;
  const hoursLeft = outStages.reduce((a, x) => a + x.hoursLeft, 0);
  const hoursTotal = outStages.reduce((a, x) => a + x.hoursTotal, 0);
  const doneCount = flat.filter((r) => r.done).length;

  const milestones = [];
  for (const st2 of outStages) {
    for (const r of st2.items) {
      if (r.done) continue;
      if (r.type === 'exam' && r.end) milestones.push({ date: r.end, label: `${st2.cert?.code ?? st2.title} exam`, kind: 'exam', fixed: !!r.eventDate });
      else if (r.type === 'event' && r.eventDate) milestones.push({ date: r.eventDate, label: r.title, kind: 'event', fixed: true });
    }
  }
  milestones.sort((a, b) => (a.date < b.date ? -1 : 1));

  return {
    stages: outStages,
    flat,
    next,
    hoursLeft,
    hoursTotal,
    doneCount,
    total: flat.length,
    percent: flat.length ? Math.round((doneCount / flat.length) * 100) : 0,
    perDay,
    milestones,
    finish: outStages.reduce((a, x) => (x.finish && (!a || x.finish > a) ? x.finish : a), null),
  };
}
