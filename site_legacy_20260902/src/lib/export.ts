// Export utilities for GOS data formats

/**
 * Generate CSV header from field names
 */
export function generateCSVHeader(fields: string[]): string {
  return fields.map(f => `"${f}"`).join(',');
}

/**
 * Convert array of objects to CSV string
 */
export function exportToCSV(data: any[], filename: string): string {
  if (data.length === 0) return '';

  const fields = Object.keys(data[0]);
  const header = generateCSVHeader(fields);
  const rows = data.map(item =>
    fields.map(f => {
      const val = item[f];
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Generate RSS/JSON Feed from places and reviews
 */
export function exportToRSS(places: any[], reviews: any[]): string {
  const feed = {
    version: '1.0',
    generated: new Date().toISOString(),
    places: places.map(p => ({
      id: p.id,
      name: p.name,
      rating: p.averageRating,
      reviewCount: p.reviewCount,
      address: p.location?.address || '',
      categories: p.categories || [],
      source: p.source,
      sourceUrl: p.sourceUrl,
      scrapedAt: p.scrapedAt
    })),
    reviews: reviews.map(r => ({
      id: r.id,
      placeId: r.placeId,
      placeName: r.placeName,
      rating: r.rating,
      comment: r.comment,
      userName: r.userName,
      publishDate: r.publishDate,
      source: r.source
    }))
  };

  return JSON.stringify(feed, null, 2);
}

/**
 * Download helper for any string content
 */
export function downloadContent(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export all data in specified format
 */
export async function exportAll(userDB: any, format: 'json' | 'csv' | 'feed'): Promise<void> {
  const data = await userDB.exportAll();
  const timestamp = Date.now();

  switch (format) {
    case 'json':
      downloadContent(JSON.stringify(data, null, 2), `gos-data-${timestamp}.json`, 'application/json');
      break;
    case 'csv':
      // Export places and reviews as separate CSV sections
      const placesCsv = exportToCSV(data.places || [], 'places');
      const reviewsCsv = exportToCSV(data.reviews || [], 'reviews');
      const combined = `PLACES\n${placesCsv}\n\nREVIEWS\n${reviewsCsv}`;
      downloadContent(combined, `gos-export-${timestamp}.csv`, 'text/csv');
      break;
    case 'feed':
      downloadContent(
        exportToRSS(data.places || [], data.reviews || []),
        `gos-feed-${timestamp}.json`,
        'application/json'
      );
      break;
  }
}