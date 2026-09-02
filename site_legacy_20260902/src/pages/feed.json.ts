import type { APIRoute } from 'astro';
import { exportToRSS } from '../lib/export';

// Note: userDB uses browser IndexedDB via GunDB.
// For SSR/static build, this returns an empty feed.
// In browser, the scraped.astro page provides live export via exportAll().
export const GET: APIRoute = async () => {
  // Static build context - return empty feed structure
  // Actual data is exported client-side via /scraped page
  const emptyFeed = {
    version: '1.0',
    generated: new Date().toISOString(),
    places: [],
    reviews: [],
    note: 'Live data available via /scraped page export feature'
  };

  return new Response(JSON.stringify(emptyFeed, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
};