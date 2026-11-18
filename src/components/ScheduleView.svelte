<script>
  import { app, pauseStudy } from '../lib/store.svelte.js';
  import { fmtDay, fmtFull, mondayOf, addDays, relative } from '../lib/dates.js';
  import { KIND } from '../lib/data.js';

  let { plan, today } = $props();
  let pause = $state(7);

  const DAYS = [
    { n: 1, l: 'Mon' },
    { n: 2, l: 'Tue' },
    { n: 3, l: 'Wed' },
    { n: 4, l: 'Thu' },
    { n: 5, l: 'Fri' },
    { n: 6, l: 'Sat' },
    { n: 0, l: 'Sun' },
  ];

  const weeks = $derived.by(() => {
    const map = new Map();
    for (const r of plan.flat) {
      if (r.done || !r.start) continue;
      const wk = mondayOf(r.start);
      if (!map.has(wk)) map.set(wk, []);
      map.get(wk).push(r);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  });

  const examStages = $derived(plan.stages.filter((s) => s.cert));
</script>

<div class="stack">
  <section class="card stack" aria-labelledby="set-h">
    <h2 id="set-h">Your study time</h2>
    <div class="row" style="align-items:flex-end;gap:16px">
      <label class="field">
        <span>Plan starts</span>
        <input type="date" bind:value={app.settings.startDate} />
      </label>
      <label class="field">
        <span>Hours per week</span>
        <input type="number" min="1" max="60" step="0.5" bind:value={app.settings.hoursPerWeek} />
      </label>
      <button class="btn" onclick={() => (app.settings.startDate = today)}>Start from today</button>
    </div>
    <fieldset style="border:0;padding:0;margin:0">
      <legend class="small" style="font-weight:500">Days you study</legend>
      <div class="checks">
        {#each DAYS as d}
          <label><input type="checkbox" value={d.n} bind:group={app.settings.studyDays} /> {d.l}</label>
        {/each}
      </div>
    </fieldset>
    <div class="row">
      <label class="row">
        <span>Pause for</span>
        <input type="number" min="1" max="120" bind:value={pause} aria-label="Days to pause" />
        <span>days from today</span>
      </label>
      <button class="btn" onclick={() => pauseStudy(pause)}>Pause and reschedule</button>
    </div>
    <p class="small muted">
      That is about <span class="mono">{Math.round(plan.perDay * 100) / 100} h</span> on each study day. Completed items are left out, so remaining work always re-plans from today (or from your start date, if that is later).
    </p>
  </section>

  <section class="card stack" aria-labelledby="tgt-h">
    <h2 id="tgt-h">Exam targets</h2>
    <div class="scroll-x">
      <table>
        <caption class="sr">Target and projected exam date for each certification</caption>
        <thead>
          <tr><th scope="col">Certification</th><th scope="col">Target date</th><th scope="col">Projected exam</th><th scope="col">Status</th></tr>
        </thead>
        <tbody>
          {#each examStages as s (s.id)}
            <tr>
              <th scope="row">{s.cert.code}</th>
              <td>
                <input type="date" aria-label="Target date for {s.cert.code}" bind:value={app.settings.targetDates[s.id]} />
              </td>
              <td class="mono">{s.complete ? 'Passed or booked' : s.projectedExam ? `${fmtDay(s.projectedExam)} (${relative(s.projectedExam, today)})` : '—'}</td>
              <td>
                {#if s.status === 'complete'}<span class="pill good">Complete</span>
                {:else if s.status === 'behind'}<span class="pill bad">{s.slipDays} days past target</span>
                {:else if s.status === 'on-track'}<span class="pill good">On track</span>
                {:else}<span class="pill">No target</span>{/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="small muted">To fix a real exam booking, enter its date on the exam item in the checklist. A booked date overrides the projection.</p>
  </section>

  <section class="card" aria-labelledby="wk-h">
    <h2 id="wk-h" style="margin-bottom:8px">Week by week</h2>
    {#if !weeks.length}<p class="muted">Nothing left to schedule.</p>{/if}
    {#each weeks as [wk, rows] (wk)}
      <div class="week">
        <h3 class="mono">Week of {fmtFull(wk)}</h3>
        <ul>
          {#each rows as r (r.id)}
            <li>
              <span class="when mono">{r.start === r.end ? fmtDay(r.start) : `${fmtDay(r.start)} to ${fmtDay(r.end)}`}</span>
              <span style="flex:1;min-width:12rem">{r.title}</span>
              <span class="pill">{KIND[r.type]}</span>
              {#if r.type !== 'exam'}<span class="mono small muted">{r.hours} h</span>{/if}
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </section>
</div>
