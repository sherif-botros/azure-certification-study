<script>
  let { links = [] } = $props();
</script>

{#if links.length}
  <ul class="links">
    {#each links as l}
      <li>
        <a href={l.url} target="_blank" rel="noopener noreferrer">{l.label}<span class="sr"> (opens in a new tab)</span></a>
        <span class="fmt">{l.fmt}</span>
      </li>
    {/each}
  </ul>
{/if}
