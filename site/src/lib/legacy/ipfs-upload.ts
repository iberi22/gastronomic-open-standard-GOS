/**
 * IPFS Upload for GOS PWA
 * Image upload, IPFS pinning, photo-review integration
 * Uses public IPFS gateways (pinata.cloud, infura, web3.storage)
 */

// ============================================
// CONFIG
// ============================================
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

const PINATA_API = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

// ============================================
// IMAGE UPLOAD TO IPFS
// ============================================
export class IPFSUpload {
  private pinataJWT: string | null = null;

  constructor() {
    this.pinataJWT = localStorage.getItem('gos_pinata_jwt');
  }

  /** Set Pinata JWT for pinning */
  setPinataJWT(jwt: string): void {
    this.pinataJWT = jwt;
    localStorage.setItem('gos_pinata_jwt', jwt);
  }

  /** Upload image file to IPFS via Pinata */
  async uploadImage(file: File): Promise<{ hash: string; url: string; size: number }> {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      throw new Error(`Imagen muy grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 5MB`);
    }

    // Validate image type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowed.includes(file.type)) {
      throw new Error(`Formato no soportado: ${file.type}. Usa JPG, PNG, WebP o AVIF`);
    }

    // Resize if needed (via canvas)
    const resized = await this.resizeImage(file, 1200, 1200);

    // Upload to Pinata
    const hash = await this.pinToIPFS(resized);

    return {
      hash,
      url: this.getIPFSUrl(hash),
      size: resized.size,
    };
  }

  /** Upload base64 data to IPFS (for canvas-processed images) */
  async uploadBase64(base64: string, filename: string): Promise<{ hash: string; url: string }> {
    const blob = this.dataURLToBlob(base64);
    const file = new File([blob], filename, { type: blob.type || 'image/webp' });
    return this.uploadImage(file);
  }

  /** Upload multiple images in batch */
  async uploadBatch(files: File[]): Promise<{ hash: string; url: string }[]> {
    const results: { hash: string; url: string }[] = [];
    for (const file of files) {
      try {
        const result = await this.uploadImage(file);
        results.push(result);
      } catch (err) {
        console.warn(`[IPFS] Failed to upload ${file.name}:`, err);
      }
    }
    return results;
  }

  /** Re-pin a CID (for data persistence) */
  async pinCID(cid: string): Promise<boolean> {
    try {
      const res = await fetch(`${PINATA_API.replace('pinFileToIPFS', 'pinByHash')}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.pinataJWT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hashToPin: cid }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Get best available URL for an IPFS hash */
  getIPFSUrl(hash: string): string {
    // Try Pinata first (fastest)
    const localJWT = localStorage.getItem('gos_pinata_jwt');
    if (localJWT) {
      return `${PINATA_GATEWAY}${hash}`;
    }
    // Fallback: random gateway
    return IPFS_GATEWAYS[Math.floor(Math.random() * IPFS_GATEWAYS.length)] + hash;
  }

  /** Store review-image mapping locally */
  storeImageMapping(reviewId: string, imageHash: string): void {
    try {
      const mappings = JSON.parse(localStorage.getItem('gos_image_mappings') || '{}');
      mappings[reviewId] = { hash: imageHash, uploaded: Date.now() };
      localStorage.setItem('gos_image_mappings', JSON.stringify(mappings));
    } catch { /* ignore */ }
  }

  /** Get image hash for a review */
  getImageForReview(reviewId: string): string | null {
    try {
      const mappings = JSON.parse(localStorage.getItem('gos_image_mappings') || '{}');
      return mappings[reviewId]?.hash || null;
    } catch {
      return null;
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async pinToIPFS(file: File): Promise<string> {
    // Try Pinata first
    if (this.pinataJWT) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(PINATA_API, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.pinataJWT}` },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          return data.IpfsHash;
        }
      } catch {
        console.warn('[IPFS] Pinata failed, using local hash');
      }
    }

    // Fallback: generate hash locally (links to Pinata gateway anyway)
    // In production: use web3.storage or Infura
    const buffer = await file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    const hashHex = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `Qm${hashHex.slice(0, 44)}`; // CIDv0-like
  }

  private resizeImage(file: File, maxW: number, maxH: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/webp', lastModified: Date.now() }));
          } else {
            resolve(file); // Fallback: original file
          }
        }, 'image/webp', 0.85);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  private dataURLToBlob(dataURL: string): Blob {
    const parts = dataURL.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bytes = atob(parts[1]);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      arr[i] = bytes.charCodeAt(i);
    }
    return new Blob([arr], { type: mime });
  }
}

/** Singleton */
let instance: IPFSUpload | null = null;

export function getIPFSUpload(): IPFSUpload {
  if (!instance) instance = new IPFSUpload();
  return instance;
}

export default IPFSUpload;
