<script>
  import { app, ui, setDone } from '../lib/store.svelte.js';
  import { FACTS, TIMELINE, KIND } from '../lib/data.js';
  import { fmtDay, fmtFull, relative, diffDays } from '../lib/dates.js';
  import Links from './Links.svelte';

  let { plan, today, go } = $props();

  const alerts = $derived.by(() => {
    const out = [];
    for (const f of FACTS) {
      if (f.check && app.verify.results[f.check]?.status === 'changed') {
        out.push({ kind: 'bad', tag: 'Changed', text: `${f.title} changed on Microsoft Learn. Check the Updates tab.` });
      }
      if (f.alert && today <= f.alert.until) out.push({ kind: 'warn', tag: 'Note', text: f.alert.text });
    }
    return out;
  });

  const ahead = $derived(
    TIMELINE.filter((t) => (t.end || t.date) >= today && diffDays(today, t.date) <= 90).sort((a, b) => (a.date < b.date ? -1 : 1)),
  );

  const upcoming = $derived(plan.flat.filter((r) => !r.done).slice(0, 6));
</script>

<div class="stack">
  {#each alerts as a}
    <div class="alert {a.kind === 'bad' ? 'bad' : ''}" role="note">
      <span class="tag">{a.tag}</span><span>{a.text}</span>
    </div>
  {/each}

  <div class="grid2">
    <section class="card stack-sm" aria-labelledby="next-h">
      <div class="eyebrow">Next recommended step</div>
      {#if plan.next}
        <h2 id="next-h">{plan.next.title}</h2>
        <div class="row small">
          <span class="pill">{KIND[plan.next.type]}</span>
          <span class="mono">{plan.next.hours} h</span>
          {#if plan.next.start}<span class="mono">{plan.next.start === plan.next.end ? fmtDay(plan.next.start) : `${fmtDay(plan.next.start)} to ${fmtDay(plan.next.end)}`}</span>{/if}
          {#if plan.next.flag === 'time'}<span class="pill warn">Time-sensitive</span>{/if}
        </div>
        <ul style="margin:0;padding-left:20px">
          {#each plan.next.details.slice(0, 3) as d}<li class="small">{d}</li>{/each}
        </ul>
        <Links links={plan.next.links} />
        <div class="row">
          <button class="btn primary" onclick={() => setDone(plan.next.id, true)}>Mark complete</button>
          <button class="btn" onclick={() => go('path')}>Open in checklist</button>
        </div>
      {:else}
        <h2 id="next-h">Every item is complete</h2>
        <p class="muted">Check the Updates tab for new requirements, and renew certifications yearly through the free assessment.</p>
      {/if}
    </section>

    <section class="card stack" aria-labelledby="prog-h">
      <div class="row spread">
        <h2 id="prog-h">Progress</h2>
        <span class="big">{plan.percent}%</span>
      </div>
      <div class="bar" role="progressbar" aria-label="Overall progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={plan.percent}><span style="width: {plan.percent}%"></span></div>
      <p class="small muted">
        <span class="mono">{plan.doneCount}/{plan.total}</span> items done ·
        <span class="mono">{Math.round(plan.hoursLeft * 10) / 10} h</span> left at
        <span class="mono">{app.settings.hoursPerWeek} h</span> a week
        {#if plan.finish}· finish around <span class="mono">{fmtFull(plan.finish)}</span>{/if}
      </p>
      <ul class="items">
        {#each plan.stages as s (s.id)}
          <li class="item">
            <div class="row spread">
              <span>{s.cert ? s.cert.code : 'Setup'}</span>
              <span class="mono small">{s.doneCount}/{s.total}</span>
            </div>
            <div class="bar" class:good={s.complete}><span style="width: {s.percent}%"></span></div>
            {#if s.projectedExam && !s.complete}
              <span class="small muted">Projected exam <span class="mono">{fmtDay(s.projectedExam)}</span>
                {#if s.status === 'behind'}<span class="pill bad">{s.slipDays} days past target</span>{/if}
                {#if s.status === 'on-track'}<span class="pill good">On track</span>{/if}
              </span>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  </div>

  <div class="grid2">
    <section class="card stack-sm" aria-labelledby="up-h">
      <h2 id="up-h">Coming up in your plan</h2>
      <ul class="items">
        {#each upcoming as r (r.id)}
          <li class="item">
            <div class="row spread">
              <span>{r.title}</span>
              <span class="mono small muted">{r.start ? fmtDay(r.start) : ''}</span>
            </div>
          </li>
        {/each}
      </ul>
      <button class="btn small" style="align-self:flex-start" onclick={() => go('schedule')}>See the full schedule</button>
    </section>

    <section class="card stack-sm" aria-labelledby="dates-h">
      <h2 id="dates-h">Dates and announcements</h2>
      <ul class="items">
        {#each plan.milestones as m}
          <li class="item">
            <div class="row spread"><span>{m.label}{m.fixed ? '' : ' (projected)'}</span><span class="mono small">{fmtDay(m.date)} · {relative(m.date, today)}</span></div>
          </li>
        {/each}
        {#each ahead as t}
          <li class="item">
            <div class="row spread"><span>{t.label}</span><span class="mono small">{fmtDay(t.date)} · {relative(t.date, today)}</span></div>
          </li>
        {/each}
        {#if !plan.milestones.length && !ahead.length}<li class="muted small">Nothing dated in the next 90 days.</li>{/if}
      </ul>
      <button class="btn small" style="align-self:flex-start" onclick={() => go('updates')}>Open the Updates tab</button>
    </section>
  </div>
</div>
