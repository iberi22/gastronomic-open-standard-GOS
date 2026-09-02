<script lang="ts">
  import { Card, Badge } from '@swal/ui';
  import { creditStatus, formatPriceBreakdown } from '../lib/billing';

  let { used = 0, tier = 'socio', infra = 0.5, aiBase = 0.3 }: { used?: number; tier?: 'free'|'socio'|'socio-managed'; infra?: number; aiBase?: number } = $props();

  const ledger = $derived(creditStatus(used, tier));
  const breakdown = $derived(formatPriceBreakdown(infra, aiBase));
  const pct = $derived(ledger.limit ? Math.round((ledger.used / ledger.limit) * 100) : 0);
</script>

<Card variant="surface" padding="md">
  <div class="head">
    <Badge variant={ledger.remaining === 0 ? 'danger' : pct > 80 ? 'warning' : 'success'}>{ledger.used}/{ledger.limit} tokens</Badge>
    <span class="pct">{pct}% usado</span>
  </div>
  <div class="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
    <div class="fill" style={`width:${pct}%`}></div>
  </div>
  <p class="breakdown">{breakdown}</p>
  <p class="hint">Credito socio via Cloudflare Workers AI (402 si agotado). Infra 100% + AI 10% min + 20% handling SWAL.</p>
</Card>

<style>
  .head { display: flex; gap: 0.5rem; align-items: center; }
  .pct { color: var(--swal-text-muted); font-size: 0.85rem; }
  .bar { height: 6px; background: var(--swal-surface); border-radius: 999px; overflow: hidden; margin-top: 0.5rem; }
  .fill { height: 100%; background: var(--swal-accent); transition: width 0.3s; }
  .breakdown { color: var(--swal-text-secondary); font-size: 0.85rem; margin: 0.5rem 0 0; font-family: var(--swal-font-mono); }
  .hint { color: var(--swal-text-muted); font-size: 0.75rem; margin: 0.25rem 0 0; }
</style>
