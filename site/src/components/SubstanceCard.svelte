<script lang="ts">
  interface Substance {
    id: string;
    data: {
      name: string;
      formula?: string;
      discovery_year?: number;
      source_ingredient?: string;
      benefit?: string;
      sazon?: string;
      sabor?: string;
      textura?: string;
      vitaminas?: string[];
      compuestos?: string[];
      image?: string;
      tags?: string[];
      health_registry?: Array<{
        condition: string;
        mechanism?: string;
        evidence_level?: string;
      }>;
    };
  }

  let { substance, base = '' }: { substance: Substance; base?: string } = $props();
  const data = substance.data;
  const baseClean = base.replace(/\/$/, '');
</script>

<article class="substance-card">
  {#if data.image}
    <div class="img-wrap">
      <img src={`${baseClean}${data.image}`} alt={data.name} loading="lazy" />
      {#if data.formula}
        <span class="formula-tag">{data.formula}</span>
      {/if}
    </div>
  {/if}

  <div class="card-body">
    <div class="header">
      <h3 class="title">
        <a href={`${baseClean}/substances/${substance.id}`}>{data.name}</a>
      </h3>
      {#if data.discovery_year}
        <span class="year">Desc. {data.discovery_year}</span>
      {/if}
    </div>

    {#if data.source_ingredient}
      <p class="source">
        <strong>Fuente:</strong> <span>{data.source_ingredient}</span>
      </p>
    {/if}

    {#if data.benefit}
      <p class="benefit">{data.benefit}</p>
    {/if}

    <div class="sensory-grid">
      {#if data.sazon}
        <div class="sensory-item">
          <span class="lbl">Sazón:</span>
          <span class="val">{data.sazon}</span>
        </div>
      {/if}
      {#if data.sabor}
        <div class="sensory-item">
          <span class="lbl">Sabor:</span>
          <span class="val">{data.sabor}</span>
        </div>
      {/if}
      {#if data.textura}
        <div class="sensory-item">
          <span class="lbl">Textura:</span>
          <span class="val">{data.textura}</span>
        </div>
      {/if}
    </div>

    {#if data.vitaminas && data.vitaminas.length > 0}
      <div class="vits">
        <strong>Vitaminas / Nutrientes:</strong>
        <div class="pills">
          {#each data.vitaminas as vit}
            <span class="pill">{vit}</span>
          {/each}
        </div>
      </div>
    {/if}

    <div class="footer-links">
      <a href={`${baseClean}/substances/${substance.id}`} class="btn-detail">Ficha completa →</a>
      <a href={`${baseClean}/graph?filter=substance:${encodeURIComponent(data.name.toLowerCase())}`} class="btn-graph">🕸️ Grafo</a>
    </div>
  </div>
</article>

<style>
  .substance-card {
    background: var(--swal-surface, #0f0f12);
    border: 1px solid var(--swal-border, #27272a);
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: border-color 0.2s ease, transform 0.2s ease;
  }
  .substance-card:hover {
    border-color: var(--swal-accent, #8b5cf6);
    transform: translateY(-2px);
  }
  .img-wrap {
    position: relative;
    width: 100%;
    height: 160px;
    background: #000;
  }
  .img-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .formula-tag {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(5, 5, 7, 0.85);
    border: 1px solid var(--swal-border, #27272a);
    color: var(--swal-accent, #8b5cf6);
    font-family: var(--swal-font-mono, monospace);
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    backdrop-filter: blur(4px);
  }
  .card-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .title {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
  }
  .title a {
    color: var(--swal-text, #fdfcf8);
    text-decoration: none;
  }
  .title a:hover {
    color: var(--swal-accent, #8b5cf6);
  }
  .year {
    font-size: 11px;
    font-family: var(--swal-font-mono, monospace);
    color: var(--swal-text-muted, #a1a1aa);
  }
  .source {
    margin: 0;
    font-size: 12px;
    color: var(--swal-text-secondary, #d4d4d8);
  }
  .benefit {
    margin: 0;
    font-size: 13px;
    color: var(--swal-text-secondary, #a1a1aa);
    line-height: 1.4;
  }
  .sensory-grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--swal-bg, #050507);
    border: 1px solid var(--swal-border, #27272a);
    padding: 10px;
    border-radius: 10px;
    font-size: 12px;
  }
  .sensory-item {
    display: flex;
    gap: 6px;
  }
  .lbl {
    color: var(--swal-text-muted, #71717a);
    font-weight: 600;
    min-width: 55px;
  }
  .val {
    color: var(--swal-text-secondary, #e4e4e7);
  }
  .vits {
    font-size: 12px;
    color: var(--swal-text-muted, #a1a1aa);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .pill {
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 999px;
    background: var(--swal-bg, #050507);
    border: 1px solid var(--swal-border, #27272a);
    color: var(--swal-text-secondary, #d4d4d8);
  }
  .footer-links {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 10px;
    border-top: 1px solid var(--swal-border, #27272a);
  }
  .btn-detail {
    color: var(--swal-accent, #8b5cf6);
    text-decoration: none;
    font-size: 12px;
    font-weight: 600;
  }
  .btn-graph {
    color: var(--swal-text-muted, #a1a1aa);
    text-decoration: none;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 6px;
    border: 1px solid var(--swal-border, #27272a);
    background: var(--swal-bg, #050507);
  }
  .btn-graph:hover {
    color: var(--swal-text, #fdfcf8);
    border-color: var(--swal-accent, #8b5cf6);
  }
</style>
