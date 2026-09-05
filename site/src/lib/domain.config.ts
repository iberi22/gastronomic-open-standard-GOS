// domain.config.ts — GOS: grafo global gastronómico
// Modelo: recipe ↔ ingredient ↔ vitamin/nutrient ↔ flavor ↔ condition ↔ diet ↔ substance ↔ technique ↔ region
// Unico archivo obligatorio — todo (Xavier/mesh/LLM/Surreal) se adapta a estas entities.

export const domainConfig = {
  appId: 'gos',
  appName: 'Gastronomic Open Standard',
  instanceId: 'default',
  entities: [
    {
      name: 'recipe',
      label: 'Receta',
      fields: [
        'title',
        'slug',
        'region',
        'country',
        'categories',
        'difficulty',
        'prep_time',
        'cook_time',
        'servings',
        'main_ingredients',
        'ingredients',
        'instructions',
        'sensory',
        'nutrition',
        'sources',
        'license',
        'file',
      ],
      xavierKind: 'recipe',
    },
    {
      name: 'ingredient',
      label: 'Ingrediente',
      fields: [
        'name',
        'scientific_name',
        'group',
        'image',
        'portions',
        'nutrition_per_100g',
        'micronutrients',
        'active_compounds',
        'health_registry',
        'sources',
        'tags',
      ],
      xavierKind: 'ingredient',
    },
    {
      name: 'vitamin',
      label: 'Vitamina / Nutriente',
      fields: [
        'code',
        'name',
        'group',
        'unit',
        'rda',
        'function',
        'deficiency',
        'sources',
        'ingredient_ids',
      ],
      xavierKind: 'vitamin',
    },
    {
      name: 'flavor',
      label: 'Sabor',
      fields: [
        'name',
        'profile',
        'intensity',
        'compounds',
        'pairs_with',
        'region_ids',
      ],
      xavierKind: 'flavor',
    },
    {
      name: 'condition',
      label: 'Afección / Beneficio',
      fields: [
        'name',
        'slug',
        'category',
        'mechanism',
        'evidence_level',
        'compounds',
        'ingredient_ids',
        'recipe_ids',
        'studies',
      ],
      xavierKind: 'condition',
    },
    {
      name: 'diet',
      label: 'Dieta / Capacidad alimenticia',
      fields: [
        'name',
        'slug',
        'description',
        'rules',
        'allowed_ingredients',
        'forbidden_ingredients',
        'health_goals',
      ],
      xavierKind: 'diet',
    },
    {
      name: 'substance',
      label: 'Substancia / Compuesto bioactivo',
      fields: [
        'name',
        'formula',
        'discovery_year',
        'source_ingredient',
        'benefit',
        'health_registry',
        'studies',
        'evidence_level',
      ],
      xavierKind: 'substance',
    },
    {
      name: 'technique',
      label: 'Técnica culinaria',
      fields: [
        'name',
        'category',
        'description',
        'temperature',
        'tools',
        'region',
      ],
      xavierKind: 'technique',
    },
    {
      name: 'region',
      label: 'Región / Terroir',
      fields: ['name', 'country', 'department', 'climate', 'places', 'traits'],
      xavierKind: 'region',
    },
    {
      name: 'review',
      label: 'Reseña / Validación',
      fields: [
        'recipe_id',
        'author',
        'rating',
        'comment',
        'verified',
        'created_at',
      ],
      xavierKind: 'review',
    },
  ],
  // Grafo: edges tipadas (no solo entidades, tambien relaciones)
  // Se materializan en graph-data.json via scripts/generate-graph.js
  // Tipos de arista canonicos:
  // recipe -[USES]-> ingredient -[CONTAINS]-> vitamin
  // ingredient -[HAS_FLAVOR]-> flavor
  // ingredient/substance -[TREATS|HELPS]-> condition
  // recipe -[FITS]-> diet
  // ingredient -[HAS_SUBSTANCE]-> substance (descubrimiento reciente)
  // recipe -[USES_TECHNIQUE]-> technique
  // recipe -[FROM_REGION]-> region -> PLACE
  aui: {
    enabled: true,
    allowAgentTheme: true,
  },
  billing: {
    tier: 'socio' as const,
    mode: 'swal-managed' as const,
  },
} as const
export type DomainConfig = typeof domainConfig
