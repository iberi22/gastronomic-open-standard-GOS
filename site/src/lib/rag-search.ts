/**
 * RAG Search Utility - Fetches relevant recipe and ingredient metadata for prompt context.
 */

export interface RagResult {
  title: string;
  slug: string;
  region?: string;
  categories?: string[];
  mainIngredients?: string[];
  difficulty?: string;
  prepTime?: string;
  cookTime?: string;
  description?: string;
  score: number;
}

/**
 * Searches the GOS recipes database and returns the most relevant recipes for the query.
 */
export async function ragSearch(query: string, limit: number = 3): Promise<RagResult[]> {
  if (!query || !query.trim()) return [];

  try {
    const baseUrl = import.meta.env.BASE_URL || '/gastronomic-open-standard-GOS';
    const res = await fetch(`${baseUrl}/api/all.json`);
    if (!res.ok) {
      throw new Error(`Failed to fetch recipe index: ${res.statusText}`);
    }

    const data = await res.json();
    const recipes = data.recipes || [];
    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    if (searchTerms.length === 0) return [];

    const results: RagResult[] = [];

    for (const recipe of recipes) {
      let score = 0;
      const title = (recipe.title || "").toLowerCase();
      const region = (recipe.metadata?.region || recipe.region || "").toLowerCase();
      const description = (recipe.metadata?.description || "").toLowerCase();
      const ingredients = (recipe.mainIngredients || recipe.metadata?.main_ingredients || []).map((i: string) => i.toLowerCase()).join(" ");
      const categories = (recipe.category || recipe.metadata?.categories || []).map((c: string) => c.toLowerCase()).join(" ");
      const tags = (recipe.tags || []).map((t: string) => t.toLowerCase()).join(" ");

      for (const term of searchTerms) {
        if (title.includes(term)) score += 10;
        if (ingredients.includes(term)) score += 5;
        if (description.includes(term)) score += 3;
        if (region.includes(term)) score += 2;
        if (categories.includes(term)) score += 2;
        if (tags.includes(term)) score += 2;
      }

      if (score > 0) {
        results.push({
          title: recipe.title,
          slug: recipe.slug || recipe.id,
          region: recipe.metadata?.region || recipe.region,
          categories: recipe.category || recipe.metadata?.categories,
          mainIngredients: recipe.mainIngredients || recipe.metadata?.main_ingredients,
          difficulty: recipe.difficulty || recipe.metadata?.difficulty,
          prepTime: recipe.prepTime || recipe.metadata?.prep_time,
          cookTime: recipe.cookTime || recipe.metadata?.cook_time,
          description: recipe.metadata?.description,
          score
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  } catch (err) {
    console.error("RAG search error:", err);
    return [];
  }
}
