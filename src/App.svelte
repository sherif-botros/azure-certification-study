<script>
  import { onMount } from 'svelte';
  import { STAGES, KIND } from './lib/data.js';
  import { buildPlan } from './lib/schedule.js';
  import { todayISO, fmtLong } from './lib/dates.js';
  import { app, ui, loadLocal, startPersistence, initRemote, stopRemote } from './lib/store.svelte.js';
  import { runChecks } from './lib/runner.svelte.js';
  import { FACTS } from './lib/data.js';

  import Overview from './components/Overview.svelte';
  import PathView from './components/PathView.svelte';
  import ScheduleView from './components/ScheduleView.svelte';
  import UpdatesView from './components/UpdatesView.svelte';
  import AssumptionsView from './components/AssumptionsView.svelte';
  import PositionDialog from './components/PositionDialog.svelte';

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'path', label: 'Path and checklist' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'updates', label: 'Updates' },
    { id: 'assumptions', label: 'Assumptions' },
  ];

  let today = $state(todayISO());
  const plan = $derived(buildPlan($state.snapshot(app), STAGES, today));
  const changed = $derived(FACTS.filter((f) => f.check && app.verify.results[f.check]?.status === 'changed').length);

  function go(tab) {
    ui.tab = tab;
    if (typeof location !== 'undefined') {
      try {
        history.replaceState(null, '', `#${tab}`);
      } catch {
        /* hash routing is best effort */
      }
    }
  }
  function fromHash() {
    const h = (location.hash || '').replace('#', '');
    if (TABS.some((t) => t.id === h)) ui.tab = h;
  }

  onMount(() => {
    loadLocal();
    const stop = startPersistence();
    fromHash();
    initRemote();
    runChecks();
    const tick = setInterval(() => (today = todayISO()), 60000);
    window.addEventListener('hashchange', fromHash);
    return () => {
      stop();
      stopRemote();
      clearInterval(tick);
      window.removeEventListener('hashchange', fromHash);
    };
  });

  $effect(() => {
    if (ui.remoteChecked && !app.setupDone && !ui.welcomeDismissed) ui.positionOpen = true;
  });

  const syncLabel = $derived.by(() => {
    if (ui.sync === 'synced') return { c: 'ok', t: 'Saved to your Claude account and this browser' };
    if (ui.sync === 'connecting') return { c: 'wait', t: 'Connecting to your Claude account. Saved in this browser.' };
    if (ui.sync === 'error') return { c: 'bad', t: `Saved in this browser only. Account sync failed (${ui.syncMsg}).` };
    if (ui.storage === 'unavailable') return { c: 'bad', t: 'This browser blocks saving. Use Backup on the Assumptions tab.' };
    return { c: 'wait', t: 'Saved in this browser only' };
  });
</script>

<a class="skip" href="#main">Skip to content</a>

<header class="top">
  <div class="wrap">
    <div class="top-inner">
      <div class="brand">
        <h1>Sherif Be Azure Expert Solution Architect</h1>
        <p>Study path for Power Platform, Dynamics 365 CRM and agentic AI certifications · {fmtLong(today)}</p>
      </div>
      <div class="syncline" role="status"><span class="dot {syncLabel.c}"></span>{syncLabel.t}</div>
    </div>
    <nav class="tabs" aria-label="Sections">
      {#each TABS as t}
        <button type="button" aria-current={ui.tab === t.id ? 'page' : undefined} onclick={() => go(t.id)}>
          {t.label}{#if t.id === 'updates' && changed}<span class="badge-count" aria-label="{changed} changed">{changed}</span>{/if}
        </button>
      {/each}
    </nav>
  </div>
</header>

<main id="main" class="wrap">
  <section class="resume" aria-label="Where you left off">
    <div>
      {#if plan.next}
        <span class="eyebrow">{app.setupDone ? 'Resume where you left off' : 'Start here'}</span><br />
        <strong>{plan.next.title}</strong>
        <span class="muted small"> · {plan.stages.find((s) => s.id === plan.next.stageId)?.cert?.code ?? 'Setup'} · {KIND[plan.next.type]}</span>
      {:else}
        <strong>Every item in your plan is complete.</strong>
      {/if}
    </div>
    <div class="row">
      {#if plan.next}<button class="btn primary" onclick={() => go('path')}>Continue</button>{/if}
      <button class="btn" onclick={() => (ui.positionOpen = true)}>Change where I am</button>
    </div>
  </section>

  {#if ui.tab === 'overview'}
    <Overview {plan} {today} {go} />
  {:else if ui.tab === 'path'}
    <PathView {plan} />
  {:else if ui.tab === 'schedule'}
    <ScheduleView {plan} {today} />
  {:else if ui.tab === 'updates'}
    <UpdatesView {today} />
  {:else}
    <AssumptionsView />
  {/if}
</main>

<PositionDialog {plan} />
