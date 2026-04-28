/**
 * GunDB Setup for GOS PWA
 * Uses IndexedDB adapter for local-first storage
 */

declare global {
  interface Window {
    gun: any;
    SEA: any;
  }
}

const GUN_DB_NAME = 'gos_pwa';
const GUN_REVIEWS_KEY = 'reviews';

let gunInstance: any = null;
let seaInstance: any = null;

/**
 * Initialize GunDB with IndexedDB adapter
 */
export async function initGun(): Promise<{ gun: any; SEA: any }> {
  if (gunInstance && seaInstance) {
    return { gun: gunInstance, SEA: seaInstance };
  }

  // GunDB and SEA are loaded via CDN in the Layout
  // This module provides a typed wrapper around the Gun instance

  const gun = window.gun || (await loadGunCDN());
  const SEA = window.SEA || gun.SEA;

  // Configure with IndexedDB adapter
  gunInstance = gun({
    file: GUN_DB_NAME,
    radix: 'radisk',
    localStorage: false,
    indexedDB: { 
      store: 'gunDB', 
      database: GUN_DB_NAME 
    }
  });

  seaInstance = SEA;

  return { gun: gunInstance, SEA: seaInstance };
}

async function loadGunCDN(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.gun) {
      resolve(window.gun);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/gun/gun.js';
    script.onload = () => {
      // Load SEA (Security, Encryption, Authorization) module
      const seaScript = document.createElement('script');
      seaScript.src = 'https://cdn.jsdelivr.net/npm/gun/sea.js';
      seaScript.onload = () => resolve(window.gun);
      seaScript.onerror = reject;
      document.head.appendChild(seaScript);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Get all reviews from local GunDB
 */
export async function getReviews(): Promise<any[]> {
  const { gun } = await initGun();

  return new Promise((resolve) => {
    const reviews: any[] = [];

    gun.get(GUN_REVIEWS_KEY)
      .map()
      .once((data: any, key: string) => {
        if (data) {
          reviews.push({ ...data, id: key });
        }
      });

    // Timeout after 2 seconds to return current results
    setTimeout(() => {
      resolve(reviews);
    }, 2000);
  });
}

/**
 * Save a review to GunDB
 */
export async function saveReview(review: {
  id: string;
  placeName: string;
  location?: string;
  rating: number;
  comment?: string;
  timestamp: number;
  country: string;
}): Promise<void> {
  const { gun } = await initGun();

  return new Promise((resolve, reject) => {
    const reviewNode = gun.get(GUN_REVIEWS_KEY).get(review.id);

    reviewNode.put(review, (ack: any) => {
      if (ack.err) {
        reject(new Error(ack.err));
      } else {
        // Also store in localStorage for quick access
        const stored = JSON.parse(localStorage.getItem('gos_reviews') || '[]');
        const existing = stored.findIndex((r: any) => r.id === review.id);
        if (existing >= 0) {
          stored[existing] = review;
        } else {
          stored.push(review);
        }
        localStorage.setItem('gos_reviews', JSON.stringify(stored));
        resolve();
      }
    });
  });
}

/**
 * Listen for new reviews being added by other peers
 */
export async function onReviewAdded(callback: (review: any) => void): Promise<void> {
  const { gun } = await initGun();

  gun.get(GUN_REVIEWS_KEY)
    .map()
    .on((data: any, key: string) => {
      if (data && data.timestamp) {
        callback({ ...data, id: key });
      }
    });
}

/**
 * Delete a review
 */
export async function deleteReview(id: string): Promise<void> {
  const { gun } = await initGun();

  return new Promise((resolve, reject) => {
    gun.get(GUN_REVIEWS_KEY).get(id).put(null, (ack: any) => {
      if (ack.err) {
        reject(new Error(ack.err));
      } else {
        // Also update localStorage
        const stored = JSON.parse(localStorage.getItem('gos_reviews') || '[]');
        const filtered = stored.filter((r: any) => r.id !== id);
        localStorage.setItem('gos_reviews', JSON.stringify(filtered));
        resolve();
      }
    });
  });
}

/**
 * Get review count
 */
export async function getReviewCount(): Promise<number> {
  const reviews = await getReviews();
  return reviews.length;
}

// Export singleton instances getter
export function getGun() {
  return gunInstance;
}

export function getSEA() {
  return seaInstance;
}