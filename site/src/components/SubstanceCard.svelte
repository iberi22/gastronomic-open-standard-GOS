<script lang="ts">
import { Badge, Card } from '@swal/ui'

interface Substance {
  slug: string
  data: {
    name: string
    formula?: string
    discovery_year?: number
    source_ingredient?: string
    benefit?: string
    sazon?: string
    sabor?: string
    textura?: string
    vitaminas?: string[]
    compuestos?: string[]
    tags?: string[]
    image?: string
    image_attribution?: string
    health_registry?: Array<{
      condition: string
      mechanism?: string
      evidence_level?: string
      studies?: Array<{
        title: string
        source: string
        year?: number
        doi?: string
      }>
    }>
  }
}

let { substance, href }: { substance: Substance; href?: string } = $props()

const s = $derived(substance.data)
const url = $derived(href ?? `/substances/${substance.slug}`)
</script>

<a href={url} class="substance-link" aria-label={s.name}>
  <Card variant="surface" padding="md" class="substance-card">
    <div class="media">
      {#if s.image}
        <img src={s.image} alt={s.name} loading="lazy" class="photo" />
      {:else}
        <div class="photo placeholder">
          <span class="ph-icon">⚗️</span>
        </div>
      {/if}
      {#if s.formula}
        <span class="formula-badge">{s.formula}</span>
      {/if}
    </div>

    <div class="content">
      <div class="head">
        <h3 class="name">{s.name}</h3>
        {#if s.discovery_year}
          <span class="year">{s.discovery_year}</span>
        {/if}
      </div>

      {#if s.source_ingredient}
        <p class="source">{s.source_ingredient}</p>
      {/if}

      {#if s.benefit}
        <p class="benefit">{s.benefit}</p>
      {/if}

      <div class="meta-grid">
        {#if s.sazon}
          <div class="meta">
            <span class="label">Sazón</span>
            <span class="value">{s.sazon}</span>
          </div>
        {/if}
        {#if s.sabor}
          <div class="meta">
            <span class="label">Sabor</span>
            <span class="value">{s.sabor}</span>
          </div>
        {/if}
        {#if s.textura}
          <div class="meta">
            <span class="label">Textura</span>
            <span class="value">{s.textura}</span>
          </div>
        {/if}
      </div>

      {#if s.vitaminas?.length}
        <div class="chips">
          {#each s.vitaminas as v}
            <Badge variant="surface">{v}</Badge>
          {/each}
        </div>
      {/if}

      {#if s.health_registry?.length}
        <div class="health">
          <span class="health-label">{s.health_registry.length} registro(s) de salud</span>
          <span class="health-conditions">
            {s.health_registry.map(h=>h.condition).slice(0,2).join(" · ")}
          </span>
        </div>
      {/if}

      {#if s.compuestos?.length}
        <p class="compounds">{s.compuestos.slice(0,3).join(" · ")}</p>
      {/if}
    </div>
  </Card>
</a>

<style>
  .substance-link { text-decoration: none; color: inherit; display: block; height: 100%; }
  .substance-link :global(.substance-card) {
    height: 100%; display: flex; flex-direction: column;
    border: 1px solid var(--swal-border);
    background: var(--swal-surface);
    border-radius: 20px;
    overflow: hidden;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  }
  .substance-link:hover :global(.substance-card) {
    border-color: color-mix(in srgb, var(--swal-accent) 30%, var(--swal-border));
    box-shadow: 0 8px 32px rgba(139,92,246,0.12);
    transform: translateY(-2px);
  }
  .media { position: relative; height: 200px; overflow: hidden; background: var(--swal-bg); border-bottom: 1px solid var(--swal-border); }
  .photo { width: 100%; height: 100%; object-fit: cover; display: block; }
  .photo.placeholder { display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--swal-accent) 8%, var(--swal-surface)); }
  .ph-icon { font-size: 40px; opacity: 0.6; }
  .formula-badge {
    position: absolute; bottom: 10px; right: 10px;
    background: var(--swal-bg); color: var(--swal-text);
    border: 1px solid var(--swal-border);
    font-family: var(--swal-font-mono, ui-monospace);
    font-size: 11px; font-weight: 700;
    padding: 4px 8px; border-radius: 999px;
  }
  .content { padding: 16px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .name { margin: 0; font-size: 16px; font-weight: 800; color: var(--swal-text); font-family: var(--swal-font, Inter, sans-serif); letter-spacing: -0.02em; }
  .year { font-family: var(--swal-font-mono, ui-monospace); font-size: 11px; color: var(--swal-text-muted); border: 1px solid var(--swal-border); padding: 2px 6px; border-radius: 6px; background: var(--swal-bg); }
  .source { margin: 0; font-size: 12px; color: var(--swal-text-muted); font-style: italic; line-height: 1.4; }
  .benefit { margin: 0; font-size: 13px; color: var(--swal-text-secondary); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .meta-grid { display: grid; grid-template-columns: 1fr; gap: 6px; margin-top: 2px; }
  .meta { display: flex; flex-direction: column; gap: 2px; border-left: 2px solid color-mix(in srgb, var(--swal-accent) 40%, transparent); padding-left: 8px; }
  .label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--swal-text-muted); }
  .value { font-size: 12px; color: var(--swal-text-secondary); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips :global(.badge) { font-size: 10px; }
  .health { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; padding: 8px 10px; background: color-mix(in srgb, var(--swal-accent) 6%, var(--swal-surface)); border: 1px solid color-mix(in srgb, var(--swal-accent) 14%, var(--swal-border)); border-radius: 12px; }
  .health-label { font-size: 10px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--swal-accent); }
  .health-conditions { font-size: 12px; color: var(--swal-text-secondary); line-height: 1.4; }
  .compounds { margin: 2px 0 0; font-family: var(--swal-font-mono, ui-monospace); font-size: 11px; color: var(--swal-text-muted); line-height: 1.4; }
</style>
