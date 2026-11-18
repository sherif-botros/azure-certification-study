<script>
  import { STAGES } from '../lib/data.js';
  import { app, ui, setPosition } from '../lib/store.svelte.js';

  let { plan } = $props();

  let dlg = $state();
  let stageId = $state('setup');
  let itemId = $state('');
  let markEarlier = $state(true);
  let resetFromHere = $state(false);

  const stages = $derived(STAGES.filter((s) => s.items && app.settings.include[s.id] !== false));
  const items = $derived((stages.find((s) => s.id === stageId) || stages[0])?.items || []);

  $effect(() => {
    if (!items.some((i) => i.id === itemId) && items.length) itemId = items[0].id;
  });

  $effect(() => {
    if (!dlg) return;
    if (ui.positionOpen && !dlg.open) {
      if (plan.next) {
        stageId = plan.next.stageId;
        itemId = plan.next.id;
      }
      dlg.showModal();
    } else if (!ui.positionOpen && dlg.open) dlg.close();
  });

  function choose() {
    setPosition(itemId, { markEarlier, resetFromHere });
    ui.positionOpen = false;
  }
  function fromStart() {
    setPosition(stages[0].items[0].id, { markEarlier: false, resetFromHere: false });
    ui.positionOpen = false;
  }
  function onclose() {
    ui.positionOpen = false;
    if (!app.setupDone) ui.welcomeDismissed = true;
  }
</script>

<dialog bind:this={dlg} {onclose} aria-labelledby="pos-h">
  <div class="dialog-body">
    <div>
      <h2 id="pos-h">Where are you in the path?</h2>
      <p class="small muted">Pick the first item you have not finished. Your choice is saved, and the app reopens here next time.</p>
    </div>
    <label class="field">
      <span>Stage</span>
      <select bind:value={stageId}>
        {#each stages as s}<option value={s.id}>{s.cert ? s.cert.code + ' ' : ''}{s.title.replace(/^[A-Z]{2}-\d{3} /, '')}</option>{/each}
      </select>
    </label>
    <label class="field">
      <span>First item still to do</span>
      <select bind:value={itemId}>
        {#each items as i}<option value={i.id}>{i.title}</option>{/each}
      </select>
    </label>
    <div class="checks" style="flex-direction:column;gap:4px">
      <label><input type="checkbox" bind:checked={markEarlier} /> Mark everything before it as complete</label>
      <label><input type="checkbox" bind:checked={resetFromHere} /> Untick this item and everything after it</label>
    </div>
    <div class="row spread">
      <button class="btn" type="button" onclick={fromStart}>I am starting from the beginning</button>
      <div class="row">
        <button class="btn" type="button" onclick={() => dlg.close()}>Cancel</button>
        <button class="btn primary" type="button" onclick={choose}>Save my position</button>
      </div>
    </div>
  </div>
</dialog>
