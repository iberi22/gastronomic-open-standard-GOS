<script lang="ts">
  import { Badge } from '@swal/ui';
  let { tier = 'socio', mode = 'swal-managed' }: { tier?: string; mode?: string } = $props();
  const label = tier === 'socio-managed' ? 'Socio Gestionado' : tier === 'socio' ? 'Socio' : 'Free';
  const variant = tier === 'socio-managed' ? 'success' : tier === 'socio' ? 'info' : 'neutral';
</script>

<Badge variant={variant as any} dot={tier !== 'free'}>{label} • {mode === 'swal-managed' ? 'SWAL gestiona' : 'Self-managed'}</Badge>
