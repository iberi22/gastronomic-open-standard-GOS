// Pure function extracted from the Astro API route to allow unit testing in vitest.
// Resolving astro:content within vitest is problematic, so the API route delegates
// to this pure function after fetching the ids via getCollection.
//
// Behavior:
// - Groups ids by their first segment (split by '/'), defaulting to 'unknown' if empty.
// - Returns descending sorted counts.
// - Relies on Map insertion order and stable Array.prototype.sort (ES2019+)
//   to break ties by first-appearance order.
export function countryCounts(
  ids: readonly string[],
): { country: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const id of ids) {
    const country = (id.split('/')[0] || 'unknown').toLowerCase()
    counts.set(country, (counts.get(country) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
}
