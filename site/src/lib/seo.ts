// seo.ts — JSON-LD generators for schema.org Recipe / Ingredient / ChemicalSubstance (GOS-03)
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
  nutrition?: Record<string, unknown>;
}

export interface IngredientLDInput {
  slug: string;
  name: string;
  scientific_name?: string;
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

const SITE_URL = "https://iberi22.github.io/gastronomic-open-standard-GOS";

function absUrl(path: string): string {
  if (!path) return SITE_URL;
  if (path.startsWith("http")) return path;
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
    keywords: input.keywords?.join(", "),
    recipeCategory: input.recipeCategory,
    recipeCuisine: input.recipeCuisine ?? "Colombian",
    prepTime: input.prepTime,
    cookTime: input.cookTime,
    recipeIngredient: undefined, // populated by page from ingredients list if available
    nutrition: input.nutrition ? { "@type": "NutritionInformation", ...input.nutrition } : undefined,
    url: absUrl(`/recipes/${input.slug}`),
    isPartOf: { "@type": "WebSite", name: "Gastronomic Open Standard", url: SITE_URL },
  };
}

export function ingredientJsonLd(input: IngredientLDInput) {
  // Use schema.org FoodIngredient / DefinedTerm pattern — Ingredients are food entities
  return {
    "@context": "https://schema.org",
    "@type": "Ingredient" as unknown as string, // Ingredient is proposed; fallback to Food + DefinedTerm
    name: input.name,
    alternateName: input.scientific_name,
    description: input.description ?? `${input.name} — ingrediente del grafo GOS`,
    image: input.image ? absUrl(input.image) : undefined,
    url: absUrl(`/ingredients/${input.slug}`),
    nutrition: input.nutrition_per_100g ? { "@type": "NutritionInformation", ...input.nutrition_per_100g } : undefined,
    // health_registry as associated health claims
    healthClaim: input.health_registry,
  };
}

// Primary for GOS-03: ChemicalSubstance per schema.org
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
    chemicalComposition: d.formula, // e.g., C6H10OS2
    description: d.benefit ?? d.sazon ?? `Sustancia bioactiva ${d.name} del GOS`,
    // discovery as additionalProperty
    additionalProperty: [
      d.discovery_year ? { "@type": "PropertyValue", name: "discovery_year", value: d.discovery_year } : null,
      d.source_ingredient ? { "@type": "PropertyValue", name: "source_ingredient", value: d.source_ingredient } : null,
      d.sazon ? { "@type": "PropertyValue", name: "sazon", value: d.sazon } : null,
      d.sabor ? { "@type": "PropertyValue", name: "sabor", value: d.sabor } : null,
      d.textura ? { "@type": "PropertyValue", name: "textura", value: d.textura } : null,
    ].filter(Boolean),
    // vitamins as contains
    contains: d.vitaminas?.map(v => ({ "@type": "Vitamin" as unknown as string, name: v })),
    // related compounds
    isRelatedTo: d.compuestos?.map(c => ({ "@type": "ChemicalSubstance", name: c })),
    // health registry → associatedDisease with evidence
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

// Helper to stringify safely for <script>
export function toJsonLdString(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}
