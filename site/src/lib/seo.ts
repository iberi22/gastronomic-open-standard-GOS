/**
 * SEO & Schema.org JSON-LD generators for Gastronomic Open Standard (GOS)
 */

export function recipeJsonLd(recipe: any) {
  const data = recipe?.data || {};
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: data.title || recipe?.id,
    description: data.description || `Receta tradicional y científica: ${data.title || recipe?.id}`,
    recipeCuisine: data.region || 'Latinoamericana',
    prepTime: data.prep_time ? `PT${parseInt(data.prep_time)}M` : undefined,
    cookTime: data.cook_time ? `PT${parseInt(data.cook_time)}M` : undefined,
    recipeYield: data.servings ? `${data.servings} porciones` : undefined,
    recipeIngredient: data.main_ingredients || [],
    nutrition: data.nutrition_per_serving ? {
      '@type': 'NutritionInformation',
      calories: data.nutrition_per_serving.calories ? `${data.nutrition_per_serving.calories} calories` : undefined,
      proteinContent: data.nutrition_per_serving.protein_g ? `${data.nutrition_per_serving.protein_g} g` : undefined,
      fatContent: data.nutrition_per_serving.fat_g ? `${data.nutrition_per_serving.fat_g} g` : undefined,
      carbohydrateContent: data.nutrition_per_serving.carbs_g ? `${data.nutrition_per_serving.carbs_g} g` : undefined,
    } : undefined,
    author: {
      '@type': 'Organization',
      name: 'Gastronomic Open Standard (GOS)'
    }
  };
}

export function ingredientJsonLd(ingredient: any) {
  const data = ingredient?.data || {};
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: data.name || ingredient?.id,
    alternateName: data.scientific_name,
    description: `Ingrediente culinario: ${data.name || ingredient?.id}. Grupo: ${data.group || 'Alimento'}.`,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'GOS Ingredients Database',
      url: 'https://iberi22.github.io/gastronomic-open-standard-GOS/ingredients'
    }
  };
}

export function substanceJsonLd(substance: any) {
  const data = substance?.data || {};
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: data.name || substance?.id,
    termCode: data.formula,
    description: data.benefit || `Substancia bioactiva ${data.name}`,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'GOS Substance Encyclopedia',
      url: 'https://iberi22.github.io/gastronomic-open-standard-GOS/substances'
    }
  };
}
