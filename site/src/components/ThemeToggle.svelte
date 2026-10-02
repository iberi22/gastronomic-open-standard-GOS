<script lang="ts">
  import { Icon } from '@swal/ui'
  import { setTheme } from '@swal/ui/theme-boot'
  import { onMount } from 'svelte'
  import '../lib/gos-icons'

  // Claro / oscuro / sistema. El script de arranque del <head> aplica la
  // eleccion guardada antes de pintar; aqui solo se cambia y persiste en
  // runtime. 'system' borra la eleccion y deja que el CSS siga al sistema.
  type Mode = 'system' | 'light' | 'dark'
  const ORDER: Mode[] = ['system', 'light', 'dark']
  const LABEL: Record<Mode, string> = { system: 'Sistema', light: 'Claro', dark: 'Oscuro' }
  const ICON: Record<Mode, string> = { system: 'monitor', light: 'sun', dark: 'moon' }

  let mode = $state<Mode>('system')

  onMount(() => {
    try {
      const saved = localStorage.getItem('swal-theme')
      if (saved === 'light' || saved === 'dark') mode = saved
    } catch {
      /* localStorage bloqueado: se sigue al sistema */
    }
  })

  function next() {
    mode = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]
    setTheme(mode)
  }
</script>

<button
  type="button"
  class="theme-toggle"
  onclick={next}
  aria-label={`Tema: ${LABEL[mode]}. Cambiar tema`}
  title={`Tema: ${LABEL[mode]}`}
>
  <Icon name={ICON[mode]} size={18} />
  <span class="lbl">{LABEL[mode]}</span>
</button>

<style>
  .theme-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    padding: 0 0.875rem;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--swal-text);
    background: var(--swal-surface);
    border: 1px solid var(--swal-border-strong);
    border-radius: var(--swal-radius);
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  .theme-toggle:hover { background: var(--swal-surface-hover); }
  .theme-toggle:active { background: var(--swal-surface-active); }
</style>
