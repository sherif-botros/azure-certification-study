<script>
  import { app, setDone, setHours, setEventDate, setNote } from '../lib/store.svelte.js';
  import { KIND } from '../lib/data.js';
  import { fmtDay, addBusinessDays, fmtFull } from '../lib/dates.js';
  import Links from './Links.svelte';

  let { item } = $props();

  const cid = $derived(`chk-${item.id}`);
  const overridden = $derived(app.hours[item.id] !== undefined);
  const discountReady = $derived(item.id === 'setup-vtd-attend' && item.eventDate ? addBusinessDays(item.eventDate, 5) : null);

  function when() {
    if (item.done) return `Done ${fmtDay(item.doneAt)}`;
    if (!item.start) return '';
    return item.start === item.end ? fmtDay(item.start) : `${fmtDay(item.start)} to ${fmtDay(item.end)}`;
  }
</script>

<li class="item" class:is-done={item.done}>
  <div class="item-main">
    <input type="checkbox" id={cid} checked={item.done} onchange={(e) => setDone(item.id, e.currentTarget.checked)} />
    <label for={cid}><span class="item-title">{item.title}</span></label>
    <span class="pill {item.type === 'exam' ? 'accent' : ''}">{KIND[item.type]}</span>
    {#if item.flag === 'time'}<span class="pill warn">Time-sensitive</span>{/if}
  </div>

  <div class="item-meta">
    {#if item.type !== 'exam' && !(item.type === 'event' && item.eventDate)}
      <label>
        <span class="sr">Estimated hours for {item.title}</span>
        <input type="number" min="0" step="0.25" value={item.hours} onchange={(e) => setHours(item.id, e.currentTarget.value)} /> h
      </label>
      {#if overridden}
        <button class="btn small" onclick={() => setHours(item.id, '')}>Reset hours</button>
      {/if}
    {/if}
    {#if item.type === 'exam' || item.type === 'event'}
      <label>
        {item.eventLabel}:
        <input type="date" value={item.eventDate} onchange={(e) => setEventDate(item.id, e.currentTarget.value)} />
      </label>
    {/if}
    {#if when()}<span class="mono">{when()}</span>{/if}
    {#if item.warn}<span class="pill bad">{item.warn}</span>{/if}
    {#if discountReady}<span class="pill good">Discount should show on your profile from {fmtFull(discountReady)}</span>{/if}
  </div>

  <details class="more">
    <summary>Details, links and notes</summary>
    {#if item.audio}<p class="muted small">Audio route: open the Learn page in Edge and use Read Aloud (Ctrl+Shift+U).</p>{/if}
    <ul>
      {#each item.details as d}<li>{d}</li>{/each}
    </ul>
    <Links links={item.links} />
    <label class="field">
      <span>Your notes</span>
      <textarea
        style="min-height:72px; font-family: var(--font-body); font-size: 0.9rem"
        value={app.notes[item.id] || ''}
        onchange={(e) => setNote(item.id, e.currentTarget.value)}
      ></textarea>
    </label>
  </details>
</li>
