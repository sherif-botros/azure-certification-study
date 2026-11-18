<script>
  import { app, ui, exportJson, importJson } from '../lib/store.svelte.js';
  import { AREAS, STAGES } from '../lib/data.js';

  let importText = $state('');
  let msg = $state('');
  let exportText = $state('');

  const stages = STAGES.map((s) => ({ id: s.id, label: s.cert ? `${s.cert.code} ${s.cert.name.replace('Microsoft Certified: ', '')}` : 'Setup and discounts' }));
  const levelWords = { new: 'New to it (full hours)', some: 'Some experience (85% of hours)', strong: 'Strong (60% of hours)' };

  function doExport() {
    exportText = exportJson();
    msg = 'Copy the text below and keep it somewhere safe.';
    try {
      navigator.clipboard.writeText(exportText).then(
        () => (msg = 'Copied to the clipboard.'),
        () => {},
      );
    } catch {
      /* the viewer can copy by hand */
    }
  }
  function doImport() {
    try {
      importJson(importText);
      msg = 'Imported. Your progress and settings were replaced.';
      importText = '';
    } catch (e) {
      msg = e?.message || 'That text could not be read.';
    }
  }
</script>

<div class="stack">
  <section class="card stack" aria-labelledby="as-h">
    <div>
      <h2 id="as-h">What this plan assumes</h2>
      <p class="small muted">Change anything here. The schedule and hours update straight away.</p>
    </div>

    <fieldset style="border:0;padding:0;margin:0" class="stack-sm">
      <legend style="font-weight:500">Certifications in the plan</legend>
      <div class="checks">
        {#each stages as s}
          <label><input type="checkbox" bind:checked={app.settings.include[s.id]} /> {s.label}</label>
        {/each}
      </div>
      <p class="small muted">
        Untick PL-900 if you skip it or already hold it. AB-100 needs an active Associate certification from Microsoft’s list; this plan assumes you earn Power Platform Developer Associate (AB-400) first.
      </p>
    </fieldset>

    <div class="row" style="align-items:flex-end;gap:16px">
      <label class="field">
        <span>Study hours per week</span>
        <input type="number" min="1" max="60" step="0.5" bind:value={app.settings.hoursPerWeek} />
      </label>
      <label class="field">
        <span>Plan starts</span>
        <input type="date" bind:value={app.settings.startDate} />
      </label>
    </div>
    <p class="small muted">Default is 10 hours a week across Monday to Saturday. It is a guess: you are also job hunting, so set what you can really do.</p>

    <fieldset style="border:0;padding:0;margin:0" class="stack-sm">
      <legend style="font-weight:500">Your starting knowledge</legend>
      <p class="small muted">Defaults reflect your stack: strong C# and Azure integration work, some Logic Apps experience that carries over to cloud flows, and no Power Platform, Dataverse or Copilot Studio hands-on work.</p>
      <div class="grid2">
        {#each Object.entries(AREAS) as [key, label]}
          <label class="field">
            <span>{label}</span>
            <select bind:value={app.settings.levels[key]}>
              {#each Object.entries(levelWords) as [v, w]}<option value={v}>{w}</option>{/each}
            </select>
          </label>
        {/each}
      </div>
    </fieldset>

    <div>
      <h3>Other assumptions</h3>
      <ul class="small" style="padding-left:20px;margin:6px 0 0">
        <li>One certification at a time, in this order: PL-900, AB-400, AB-100.</li>
        <li>You learn best by listening, so reading items offer an audio route through Edge Read Aloud.</li>
        <li>Prices come from your project notes or third-party listings. Confirm them at checkout.</li>
        <li>Hands-on work needs a managed or trial environment, because of the Developer Plan change.</li>
      </ul>
    </div>
  </section>

  <section class="card stack" aria-labelledby="bk-h">
    <div>
      <h2 id="bk-h">Backup</h2>
      <p class="small muted">
        Progress is saved in this browser
        {#if ui.sync === 'synced'}and to your Claude account, so it follows you across devices{:else}. Open this page in claude.ai to also sync it to your account{/if}.
        This copy and paste backup works anywhere.
      </p>
    </div>
    <div class="row">
      <button class="btn" onclick={doExport}>Show and copy my progress</button>
    </div>
    {#if exportText}
      <label class="field"><span>Saved state</span><textarea readonly value={exportText}></textarea></label>
    {/if}
    <label class="field">
      <span>Paste saved state to restore it</span>
      <textarea bind:value={importText} placeholder="Paste the text you copied earlier"></textarea>
    </label>
    <div class="row">
      <button class="btn" onclick={doImport} disabled={!importText.trim()}>Restore from pasted text</button>
    </div>
    <p aria-live="polite" class="small">{msg}</p>
  </section>
</div>
