<script lang="ts">
  import { Button, Card, Badge, Input, Table, Tabs, Skeleton, Modal, StatusBadge } from '@swal/ui';
  import type { AuiSpec } from '../lib/aui';

  let { spec }: { spec: AuiSpec } = $props();

  // Mapa whitelisteado type -> componente Svelte real
  const MAP: Record<string, any> = {
    Card,
    Button,
    Badge,
    Input,
    Table,
    Tabs,
    Modal,
    StatusBadge,
    Skeleton,
  };

  // Render helper: si el agente pide data.kind/query, aqui se haria fetch a Xavier/mesh (stub ahora)
  // Para build verde dejamos data sin resolver — el componente recibe props tal cual
</script>

<div class="aui">
  {#if spec.theme}
    <style>
      :global(:root) {
        {spec.theme.accent ? `--swal-accent: ${spec.theme.accent};` : ''}
        {spec.theme.bg ? `--swal-bg: ${spec.theme.bg};` : ''}
        {spec.theme.radius ? `--swal-radius: ${spec.theme.radius};` : ''}
      }
    </style>
  {/if}
  {#if spec.copy?.title}
    <h2 class="aui-title">{spec.copy.title}</h2>
    {#if spec.copy.subtitle}<p class="aui-sub">{spec.copy.subtitle}</p>{/if}
  {/if}

  <div class="aui-grid">
    {#each spec.components as c (c.id)}
      {@const Comp = MAP[c.type]}
      {#if Comp}
        <div class="aui-cell" data-aui-id={c.id} data-aui-type={c.type}>
          {#if c.type === 'Card'}
            <Card {...c.props as any}>
              {#if (c.props as any).title}<strong>{(c.props as any).title}</strong>{/if}
              {#if (c.props as any).content}<p>{(c.props as any).content}</p>{/if}
            </Card>
          {:else if c.type === 'Button'}
            <Button {...c.props as any}>{(c.props as any).label ?? (c.props as any).children ?? 'Acción'}</Button>
          {:else if c.type === 'Badge'}
            <Badge {...c.props as any}>{(c.props as any).label ?? 'Badge'}</Badge>
          {:else if c.type === 'Input'}
            <Input {...c.props as any} />
          {:else if c.type === 'Table'}
            <Table {...c.props as any} />
          {:else if c.type === 'Tabs'}
            <Tabs {...c.props as any} />
          {:else if c.type === 'Modal'}
            <Modal {...c.props as any} />
          {:else if c.type === 'StatusBadge'}
            <StatusBadge {...c.props as any} />
          {:else if c.type === 'Skeleton'}
            <Skeleton {...c.props as any} />
          {:else}
            <Comp {...c.props as any} />
          {/if}
        </div>
      {:else}
        <div class="aui-unknown">Componente no whitelisteado: {c.type}</div>
      {/if}
    {/each}
  </div>
  {#if spec.components.length === 0}
    <p class="aui-empty">AUI vacia — el agente no genero componentes. Pide al LLM: "genera una Card con stats de {spec.components.length} items"</p>
  {/if}
</div>

<style>
  .aui { display: grid; gap: 1rem; }
  .aui-title { font-size: 1.2rem; font-weight: 800; color: var(--swal-text); }
  .aui-sub { color: var(--swal-text-secondary); margin: 0; }
  .aui-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.9rem; }
  .aui-cell { min-width: 0; }
  .aui-empty { color: var(--swal-text-muted); font-size: 0.9rem; }
  .aui-unknown { color: var(--swal-danger); font-size: 0.85rem; border: 1px dashed var(--swal-danger); padding: 0.5rem; border-radius: var(--swal-radius); }
</style>
