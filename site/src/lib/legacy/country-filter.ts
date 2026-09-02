/**
 * Country Filter for GOS PWA
 * Each node stores data only for its country
 * Países: CO, PE, MX, AR, US, CN
 */

// ============================================
// SUPPORTED COUNTRIES
// ============================================
export const ALLOWED_COUNTRIES: Record<string, { name: string; lang: string; currency: string; flag: string }> = {
  CO: { name: 'Colombia', lang: 'es', currency: 'COP', flag: '🇨🇴' },
  PE: { name: 'Perú', lang: 'es', currency: 'PEN', flag: '🇵🇪' },
  MX: { name: 'México', lang: 'es', currency: 'MXN', flag: '🇲🇽' },
  AR: { name: 'Argentina', lang: 'es', currency: 'ARS', flag: '🇦🇷' },
  US: { name: 'Estados Unidos', lang: 'en', currency: 'USD', flag: '🇺🇸' },
};

const STORAGE_KEY = 'gos_country';
const GITHUB_RAW = 'https://raw.githubusercontent.com/iberi22/gos-p2p-data/main';

// ============================================
// COUNTRY FILTER CLASS
// ============================================
export class CountryFilter {
  private country: string | null = null;
  private onProgress?: (msg: string) => void;

  constructor(onProgress?: (msg: string) => void) {
    this.onProgress = onProgress;
    this.country = localStorage.getItem(STORAGE_KEY);
  }

  /** Get current country code */
  getCountry(): string | null {
    return this.country;
  }

  /** Get country metadata */
  getCountryInfo(code: string) {
    return ALLOWED_COUNTRIES[code] || null;
  }

  /** Auto-detect country from browser locale or geolocation */
  async autoDetect(): Promise<string> {
    // Try geolocation first
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=es`
      );
      const data = await res.json();
      if (data.countryCode && ALLOWED_COUNTRIES[data.countryCode]) {
        return data.countryCode;
      }
    } catch {
      // Geolocation failed, fallback to language
    }

    // Fallback: detect from navigator language
    const lang = navigator.language || '';
    if (lang.startsWith('es')) {
      const langMap: Record<string, string> = {
        'es-CO': 'CO', 'es-PE': 'PE', 'es-MX': 'MX',
        'es-AR': 'AR', 'es-US': 'US',
      };
      for (const [key, val] of Object.entries(langMap)) {
        if (lang.includes(key)) return val;
      }
      return 'CO'; // Default español → Colombia
    }

    return 'US'; // Default English → US
  }

  /** Set country and download its data */
  async setCountry(code: string): Promise<void> {
    if (!ALLOWED_COUNTRIES[code]) {
      throw new Error(`País no soportado: ${code}`);
    }

    this.country = code;
    localStorage.setItem(STORAGE_KEY, code);
    await this.clearOtherCountries();
    await this.downloadCountryData();
  }

  /** Get GunDB sub-node scoped to current country */
  getScopedDB(gun: any): any {
    if (!this.country) throw new Error('Country not set');
    return gun.get('countries').get(this.country);
  }

  /** Validate that data belongs to current country */
  validateWriteContext(data: any): boolean {
    if (!this.country) throw new Error('Country not set');
    if (data.country && data.country !== this.country) {
      throw new Error(`No puedes escribir datos de ${data.country} desde el nodo de ${this.country}`);
    }
    return true;
  }

  /** Get list of peer country codes (for P2P sharing) */
  getPeerCountries(): string[] {
    return Object.keys(ALLOWED_COUNTRIES).filter(c => c !== this.country);
  }

  /** Clear cached data from other countries */
  async clearOtherCountries(): Promise<void> {
    for (const code of Object.keys(ALLOWED_COUNTRIES)) {
      if (code !== this.country) {
        localStorage.removeItem(`gos_data_${code}`);
      }
    }
  }

  /** Download all data for current country from GitHub */
  async downloadCountryData(): Promise<void> {
    if (!this.country) throw new Error('Country not set');
    const c = this.country.toLowerCase();
    const folders = [
      `ingredients/${c}/`,
      `dishes/${c}/`,
      `reviews/${this.country}/`,
      `products/${this.country}/`,
      `users/${this.country}/`,
      `voters/${this.country}/`,
    ];

    this.log(`Descargando datos de ${ALLOWED_COUNTRIES[this.country].name}...`);

    for (const folder of folders) {
      await this.downloadFolder(folder);
    }

    // Save download timestamp
    localStorage.setItem('gos_last_download', Date.now().toString());
    this.log('Descarga completa');
  }

  private async downloadFolder(folder: string): Promise<void> {
    try {
      const url = `${GITHUB_RAW}/${folder}`;
      const res = await fetch(url);
      if (!res.ok) return; // Folder might not exist yet

      const files = await res.json();
      for (const file of files) {
        if (file.type === 'file') {
          const content = await fetch(file.download_url).then(r => r.text());
          const cacheKey = `gos_data_${folder.replace('/', '_')}_${file.name}`;
          localStorage.setItem(cacheKey, content);
        }
      }
    } catch {
      this.log(`⚠️ No se pudo descargar ${folder} (puede estar vacío)`);
    }
  }

  private log(msg: string): void {
    if (this.onProgress) this.onProgress(msg);
    console.log('[CountryFilter]', msg);
  }
}

/** Singleton instance */
let instance: CountryFilter | null = null;

export function getCountryFilter(onProgress?: (msg: string) => void): CountryFilter {
  if (!instance) {
    instance = new CountryFilter(onProgress);
  }
  return instance;
}

export default CountryFilter;
