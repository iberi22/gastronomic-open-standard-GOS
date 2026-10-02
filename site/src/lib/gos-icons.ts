// Iconos propios de GOS sobre el registro del core (@swal/ui/icons). Mismo
// lenguaje que los del core: rejilla 24x24, trazo 1.75, sin relleno (Lucide, ISC).
// Importar este modulo antes de renderizar un <Icon> que use estos nombres.
import { registerIcons } from '@swal/ui/icons'

export const GOS_ICONS: Record<string, string[]> = {
  graph: [
    'M18 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    'M6 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    'M18 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    'm8.59 13.51 6.83 3.98',
    'm15.41 6.51-6.82 3.98',
  ],
  flask: [
    'M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2',
    'M8.5 2h7',
    'M7 16h10',
  ],
  globe: [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
    'M2 12h20',
    'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  ],
  leaf: [
    'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z',
    'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
  ],
  bot: [
    'M12 8V4H8',
    'M4 8h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z',
    'M2 14h2',
    'M20 14h2',
    'M15 13v2',
    'M9 13v2',
  ],
  search: ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'm21 21-4.3-4.3'],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'M12 2v2',
    'M12 20v2',
    'm4.93 4.93 1.41 1.41',
    'm17.66 17.66 1.41 1.41',
    'M2 12h2',
    'M20 12h2',
    'm6.34 17.66-1.41 1.41',
    'm19.07 4.93-1.41 1.41',
  ],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
  monitor: [
    'M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    'M8 21h8',
    'M12 17v4',
  ],
  database: [
    'M12 3c4.97 0 9 1.34 9 3s-4.03 3-9 3-9-1.34-9-3 4.03-3 9-3z',
    'M3 6v12c0 1.66 4.03 3 9 3s9-1.34 9-3V6',
    'M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3',
  ],
}

registerIcons(GOS_ICONS)
