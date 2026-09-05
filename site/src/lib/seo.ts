// seo.ts — JSON-LD generators for schema.org Recipe / Ingredient / ChemicalSubstance (GOS-03/GOS-06)
// Used in recipes, ingredients, substances pages via <script type="application/ld+json">

export interface RecipeLDInput {
  slug: string;
  title: string;
  description?: string;
  image?: string;
  author?: string;
  datePublished?: string;
  keywords?: string[];
  recipeCategory?: string;
  recipeCuisine?: string;
  cookTime?: string;
  prepTime?: string;
  recipeYield?: string;
  recipeIngredient?: string[];
  nutrition?: Record<string, unknown>;
}

export interface IngredientLDInput {
  slug: string;
  name: string;
  scientific_name?: string;
  group?: string;
  description?: string;
  image?: string;
  nutrition_per_100g?: Record<string, unknown>;
  health_registry?: unknown[];
}

export interface SubstanceLDInput {
  slug: string;
  data: {
    name: string;
    formula?: string;
    discovery_year?: number;
    source_ingredient?: string;
    benefit?: string;
    sazon?: string;
    sabor?: string;
    textura?: string;
    vitaminas?: string[];
    compuestos?: string[];
    image?: string;
    description?: string;
    health_registry?: Array<{
      condition: string;
      mechanism?: string;
      evidence_level?: string;
      studies?: Array<{title:string; source:string; year?:number; doi?:string}>;
    }>;
  };
}

const SITE_URL = (import.meta.env?.PUBLIC_SITE_URL || "https://gos-site.pages.dev").replace(/\/$/, "");

export function absUrl(path?: string): string {
  if (!path) return SITE_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean}`;
}

export function recipeJsonLd(input: RecipeLDInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: input.title,
    image: input.image ? [absUrl(input.image)] : undefined,
    author: input.author ? { "@type": "Person", name: input.author } : { "@type": "Organization", name: "GOS" },
    datePublished: input.datePublished,
    description: input.description ?? `Receta ${input.title} del Gastronomic Open Standard`,
    keywords: Array.isArray(input.keywords) ? input.keywords.join(", ") : input.keywords,
    recipeCategory: input.recipeCategory ?? "Main dish",
    recipeCuisine: input.recipeCuisine ?? "Colombian",
    prepTime: input.prepTime,
    cookTime: input.cookTime,
    recipeYield: input.recipeYield,
    recipeIngredient: input.recipeIngredient ?? [],
    nutrition: input.nutrition ? { "@type": "NutritionInformation", ...input.nutrition } : undefined,
    url: absUrl(`/recipes/${input.slug}`),
    isPartOf: { "@type": "WebSite", name: "Gastronomic Open Standard", url: SITE_URL },
  };
}

export function ingredientJsonLd(input: IngredientLDInput) {
  const nutrition = input.nutrition_per_100g || {};
  return {
    "@context": "https://schema.org",
    "@type": "IndividualProduct",
    name: input.name,
    alternateName: input.scientific_name,
    description: input.description ?? `${input.name} — ${input.group || 'ingrediente'} del grafo GOS`,
    category: input.group || "Food",
    image: input.image ? absUrl(input.image) : undefined,
    url: absUrl(`/ingredients/${input.slug}`),
    nutrition: Object.keys(nutrition).length > 0 ? {
      "@type": "NutritionInformation",
      calories: nutrition.calories ? `${nutrition.calories} kcal` : undefined,
      proteinContent: nutrition.protein_g ? `${nutrition.protein_g}g` : undefined,
      fatContent: nutrition.fat_g ? `${nutrition.fat_g}g` : undefined,
      carbohydrateContent: nutrition.carbs_g ? `${nutrition.carbs_g}g` : undefined,
      ...nutrition
    } : undefined,
    healthClaim: input.health_registry,
    isPartOf: { "@type": "Dataset", name: "GOS Ingredient Encyclopedia", url: absUrl("/ingredients") },
  };
}

export function substanceJsonLd(input: SubstanceLDInput) {
  const d = input.data;
  const studies = (d.health_registry ?? []).flatMap(h => h.studies ?? []).map(s => ({
    "@type": "MedicalStudy" as unknown as string,
    name: s.title,
    publisher: s.source,
    datePublished: s.year ? String(s.year) : undefined,
    sameAs: s.doi ? `https://doi.org/${s.doi}` : undefined,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "ChemicalSubstance",
    name: d.name,
    alternateName: d.formula,
    chemicalComposition: d.formula,
    description: d.benefit ?? d.sazon ?? `Sustancia bioactiva ${d.name} del GOS`,
    additionalProperty: [
      d.discovery_year ? { "@type": "PropertyValue", name: "discovery_year", value: d.discovery_year } : null,
      d.source_ingredient ? { "@type": "PropertyValue", name: "source_ingredient", value: d.source_ingredient } : null,
      d.sazon ? { "@type": "PropertyValue", name: "sazon", value: d.sazon } : null,
      d.sabor ? { "@type": "PropertyValue", name: "sabor", value: d.sabor } : null,
      d.textura ? { "@type": "PropertyValue", name: "textura", value: d.textura } : null,
    ].filter(Boolean),
    contains: d.vitaminas?.map(v => ({ "@type": "Vitamin" as unknown as string, name: v })),
    isRelatedTo: d.compuestos?.map(c => ({ "@type": "ChemicalSubstance", name: c })),
    associatedDisease: (d.health_registry ?? []).map(h => ({
      "@type": "MedicalCondition",
      name: h.condition,
      mechanism: h.mechanism,
      evidenceLevel: h.evidence_level,
    })),
    image: d.image ? absUrl(d.image) : undefined,
    url: absUrl(`/substances/${input.slug}`),
    citation: studies.length ? studies : undefined,
    isPartOf: { "@type": "Dataset", name: "GOS Substance Encyclopedia", url: absUrl("/substances") },
  };
}

export function toJsonLdString(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}
