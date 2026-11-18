<script>
  import { app } from '../lib/store.svelte.js';
  import { OPTIONAL } from '../lib/data.js';
  import { currentValue, CHECKS } from '../lib/verify.js';
  import { fmtFull, fmtDay } from '../lib/dates.js';
  import ItemRow from './ItemRow.svelte';
  import Links from './Links.svelte';

  let { plan } = $props();

  function skills(stage) {
    const id = stage.cert?.checkId;
    if (!id) return null;
    const v = currentValue(id, app.verify.results);
    const live = app.verify.results[id]?.status === 'changed';
    return { weights: v.weights, asOf: v.skillsAsOf || null, live };
  }

  const statusText = (s) => {
    if (s.status === 'complete') return 'Complete';
    if (s.status === 'behind') return `${s.slipDays} day${s.slipDays === 1 ? '' : 's'} past your target`;
    if (s.status === 'on-track') return 'On track for your target';
    return 'No target date set';
  };
</script>

<div class="stack">
  <p class="muted">
    Work top to bottom. Tick an item when it is done; dates and hours update on the Schedule tab. Hours are estimates scaled to your starting knowledge, and every number is editable.
  </p>

  {#each plan.stages as stage (stage.id)}
    {@const sk = skills(stage)}
    <details class="stage" open={stage.id === plan.next?.stageId}>
      <summary>
        <div>
          <div class="eyebrow">{stage.cert ? `${stage.cert.level} certification` : 'Preparation'}</div>
          <h3>{stage.title}</h3>
        </div>
        <div class="stack-sm" style="min-width: 11rem">
          <div class="row spread small">
            <span class="mono">{stage.doneCount}/{stage.total} done</span>
            <span class="mono">{Math.round(stage.hoursLeft * 10) / 10} h left</span>
          </div>
          <div class="bar" class:good={stage.complete} role="progressbar" aria-label="{stage.title} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={stage.percent}>
            <span style="width: {stage.percent}%"></span>
          </div>
        </div>
      </summary>

      <div class="stage-body">
        <p class="muted">{stage.blurb}</p>

        {#if stage.cert}
          <section class="certbox" aria-label="{stage.cert.code} requirements">
            <div class="row spread">
              <strong>{stage.cert.name}</strong>
              <span class="pill accent">{stage.cert.code}</span>
            </div>
            <p class="small"><strong>Requirement.</strong> {stage.cert.requirement}</p>
            <p class="small"><strong>Cost.</strong> {stage.cert.price}</p>
            {#if stage.projectedExam}
              <p class="small"><strong>Projected exam date.</strong> <span class="mono">{fmtDay(stage.projectedExam)}</span> · {statusText(stage)}</p>
            {/if}
            {#if sk}
              <div class="scroll-x">
                <table>
                  <caption class="sr">Skills measured for {stage.cert.code}</caption>
                  <thead>
                    <tr><th scope="col">Skills measured{sk.asOf ? ` as of ${fmtFull(sk.asOf)}` : ''}</th><th scope="col">Weight</th></tr>
                  </thead>
                  <tbody>
                    {#each sk.weights as w}
                      <tr><td>{w.name}</td><td class="mono">{w.min}–{w.max}%</td></tr>
                    {/each}
                  </tbody>
                </table>
              </div>
              {#if sk.live}<p class="pill warn" style="align-self:flex-start">Updated from Microsoft Learn: this differs from the build.</p>{/if}
            {/if}
            <Links links={stage.cert.links} />
          </section>
        {/if}

        <ul class="items">
          {#each stage.items as item (item.id)}
            <ItemRow {item} />
          {/each}
        </ul>
      </div>
    </details>
  {/each}

  <section class="card stack-sm" aria-labelledby="opt-h">
    <h2 id="opt-h">Other AI and CRM certifications to consider later</h2>
    <p class="muted small">
      These appear on the AB-100 prerequisite list. They are not scheduled, and their details were not reviewed here. Open the official page before deciding.
    </p>
    <ul class="items">
      {#each OPTIONAL as o}
        <li class="item">
          <div class="row">
            <span class="pill accent">{o.code}</span>
            <a href={o.url} target="_blank" rel="noopener noreferrer">{o.name}<span class="sr"> (opens in a new tab)</span></a>
          </div>
          <p class="muted small">{o.why}</p>
        </li>
      {/each}
    </ul>
  </section>
</div>
