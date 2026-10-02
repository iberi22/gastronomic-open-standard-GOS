<script lang="ts">
  import { AppShell, Icon } from '@swal/ui'
  import '../lib/gos-icons'
  import ThemeToggle from './ThemeToggle.svelte'

  // Shell de GOS sobre el AppShell del core (mismo que Fize): columna lateral
  // en escritorio, barra superior con menu desplegable en movil. Se hidrata
  // (client:load) para que el menu movil funcione; el contenido de la pagina
  // llega como slot por defecto y la barra superior (idioma) como slot "topbar".
  let {
    currentPath = '/',
    base = '',
    topbar: topbarSlot,
    children,
  }: {
    currentPath?: string
    base?: string
    topbar?: import('svelte').Snippet
    children?: import('svelte').Snippet
  } = $props()

  const NAV = [
    { href: '/', label: 'Inicio', icon: 'home' },
    { href: '/graph', label: 'Grafo', icon: 'graph' },
    { href: '/recipes', label: 'Recetas', icon: 'book' },
    { href: '/ingredients', label: 'Ingredientes', icon: 'leaf' },
    { href: '/substances', label: 'Substancias', icon: 'flask' },
    { href: '/countries', label: 'Países', icon: 'globe' },
    { href: '/scientific', label: 'Ciencia', icon: 'chart' },
    { href: '/agent', label: 'Agente', icon: 'bot' },
  ]
  const items = $derived(NAV.map((i) => ({ ...i, href: `${base}${i.href}` })))
  const path = $derived(currentPath)
</script>

<AppShell {items} currentPath={path} menuLabel="Menú" navLabel="Principal">
  {#snippet brand()}
    <a class="brand" href={`${base}/`} aria-label="GOS, inicio">
      <span class="mark"><Icon name="graph" size={18} /></span>
      <span class="brand-text">
        <strong>GOS</strong>
        <small>Gastronomic Open Standard</small>
      </span>
    </a>
  {/snippet}
  {#snippet topbar()}
    {@render topbarSlot?.()}
    <ThemeToggle />
  {/snippet}
  {@render children?.()}
</AppShell>

<style>
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.625rem;
    min-width: 0;
    color: var(--swal-text);
    text-decoration: none;
  }
  .mark {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: var(--swal-radius);
    background: var(--swal-accent-muted);
    border: 1px solid var(--swal-border-strong);
    color: var(--swal-text);
  }
  .brand-text { display: flex; flex-direction: column; line-height: 1.1; min-width: 0; }
  .brand-text strong { font-size: 1rem; font-weight: 700; letter-spacing: -0.02em; }
  .brand-text small {
    font-family: var(--swal-font-mono);
    font-size: 0.625rem;
    color: var(--swal-text-secondary);
    letter-spacing: 0.02em;
  }
  /* Movil: el nombre largo no cabe junto al boton Menu. */
  @media (max-width: 768px) {
    .brand-text small { display: none; }
  }
</style>
