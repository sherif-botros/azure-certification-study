<script>
  import { app, ui, markChecked } from '../lib/store.svelte.js';
  import { FACTS, TIMELINE, AS_OF } from '../lib/data.js';
  import { CHECKS, currentValue } from '../lib/verify.js';
  import { runChecks } from '../lib/runner.svelte.js';
  import { fmtFull, fmtTime, fmtDay, relative } from '../lib/dates.js';

  let { today } = $props();

  const auto = FACTS.filter((f) => f.check);
  const manual = FACTS.filter((f) => f.manual);

  function row(f) {
    const r = app.verify.results[f.check];
    const c = CHECKS[f.check];
    const value = currentValue(f.check, app.verify.results);
    let status = 'build';
    if (r) status = r.status;
    return { f, r, c, value, status };
  }

  const stateText = {
    match: 'Matches the build',
    changed: 'Changed on Microsoft Learn',
    unreadable: 'Page layout not recognised',
    error: 'Check failed',
    build: 'Not checked this visit',
  };
  const stateClass = { match: 'good', changed: 'bad', unreadable: 'warn', error: 'warn', build: '' };
</script>

<div class="stack">
  <section class="card stack" aria-labelledby="chk-h">
    <div class="row spread">
      <div>
        <h2 id="chk-h">Automatic checks against Microsoft Learn</h2>
        <p class="small muted">
          {#if app.verify.checkedAt}Last full check {fmtTime(app.verify.checkedAt)}.{:else}No full check has finished in this browser yet.{/if}
          Values below were read from Microsoft Learn on {fmtFull(AS_OF)} when the app was built.
        </p>
      </div>
      <button class="btn primary" onclick={runChecks} disabled={ui.checking}>{ui.checking ? 'Checking…' : 'Check now'}</button>
    </div>
    <div aria-live="polite">
      {#if ui.checkMsg}
        <div class="alert {ui.checkState === 'done' ? 'good' : ui.checkState === 'running' ? '' : 'bad'}">
          <span>{ui.checkMsg}</span>
        </div>
      {/if}
    </div>

    <div class="scroll-x">
      <table>
        <caption class="sr">Time-sensitive facts checked automatically</caption>
        <thead>
          <tr><th scope="col">Fact</th><th scope="col">Current value</th><th scope="col">Status</th><th scope="col">Last verified</th><th scope="col">Source</th></tr>
        </thead>
        <tbody>
          {#each auto.map(row) as { f, r, c, value, status } (f.id)}
            <tr>
              <th scope="row">{f.title}{#if f.note}<div class="small muted" style="font-weight:400">{f.note}</div>{/if}</th>
              <td>{c.describe(value)}{#if status === 'changed' && r.got}<div class="small muted">Build value: {c.describe(c.baseline)}</div>{/if}</td>
              <td><span class="pill {stateClass[status]}">{stateText[status]}</span>{#if r?.message}<div class="small muted">{r.message}</div>{/if}</td>
              <td class="mono small">{r ? fmtTime(r.checkedAt) : `${fmtFull(AS_OF)} (build)`}</td>
              <td><a href={f.source.url} target="_blank" rel="noopener noreferrer">Open source<span class="sr"> for {f.title} (opens in a new tab)</span></a></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="card stack" aria-labelledby="man-h">
    <div>
      <h2 id="man-h">Cannot be checked automatically</h2>
      <p class="small muted">These live in scheduling systems, event sites or stores that this page cannot read. Open the source, then mark the item as checked so you can see how old your check is.</p>
    </div>
    <ul class="items">
      {#each manual as f (f.id)}
        <li class="item">
          <div class="row spread">
            <strong>{f.title}</strong>
            {#if app.manualChecks[f.id]}
              <span class="pill good">You checked {fmtDay(app.manualChecks[f.id])} · {relative(app.manualChecks[f.id], today)}</span>
            {:else}
              <span class="pill warn">Not verified in this app</span>
            {/if}
          </div>
          <p class="small">{f.detail}</p>
          <p class="small muted">Why not automatic: {f.why}</p>
          <div class="row">
            <a class="btn small" href={f.source.url} target="_blank" rel="noopener noreferrer">Open source<span class="sr"> for {f.title} (opens in a new tab)</span></a>
            <button class="btn small" onclick={() => markChecked(f.id)}>I checked this today</button>
          </div>
        </li>
      {/each}
    </ul>
  </section>

  <section class="card stack-sm" aria-labelledby="tl-h">
    <h2 id="tl-h">Dates and announcements</h2>
    <ul class="timeline">
      {#each TIMELINE as t}
        <li class:past={(t.end || t.date) < today}>
          <span class="mono small">{fmtDay(t.date)}{t.end ? ` to ${fmtDay(t.end)}` : ''}<br />{relative(t.date, today)}</span>
          <span>
            {t.label}
            <span class="pill {t.kind === 'official' ? 'good' : 'warn'}">{t.kind === 'official' ? 'Read on Microsoft Learn' : 'From your project notes'}</span>
            <a href={t.source.url} target="_blank" rel="noopener noreferrer">Source<span class="sr"> for {t.label} (opens in a new tab)</span></a>
          </span>
        </li>
      {/each}
    </ul>
  </section>
</div>
