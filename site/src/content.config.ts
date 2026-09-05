import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const dishesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/dishes' }),
  schema: z
    .object({
      title: z.string().optional(),
      region: z.string().optional(),
      language: z.string().optional(),
      license: z.string().optional(),
      difficulty: z.string().optional(),
      prep_time: z.union([z.string(), z.number()]).optional(),
      cook_time: z.union([z.string(), z.number()]).optional(),
      servings: z.union([z.string(), z.number()]).optional(),
      categories: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      main_ingredients: z.array(z.string()).optional(),
      nutrition_per_serving: z.record(z.string(), z.unknown()).optional(),
      images: z
        .array(
          z.object({
            url: z.string().optional(),
            description: z.string().optional(),
          }),
        )
        .optional(),
      sensory: z
        .object({
          flavor: z.union([z.string(), z.array(z.string())]).optional(),
          texture: z.union([z.string(), z.array(z.string())]).optional(),
          aroma: z.union([z.string(), z.array(z.string())]).optional(),
          presentation: z.string().optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough(),
})

const tipsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tips' }),
  schema: z.object({}).passthrough(),
})

const ingredientsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/ingredients' }),
  schema: z
    .object({
      name: z.string().optional(),
      scientific_name: z.string().optional(),
      group: z.string().optional(),
      image: z.string().optional(),
      portions: z.any().optional(),
      nutrition_per_100g: z.any().optional(),
      micronutrients: z.any().optional(),
      active_compounds: z.array(z.any()).optional(),
      health_registry: z.array(z.any()).optional(),
      sources: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
    })
    .passthrough(),
})

const vitaminsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/vitamins' }),
  schema: z
    .object({
      code: z.string().optional(),
      name: z.string().optional(),
      group: z.string().optional(),
      unit: z.string().optional(),
    })
    .passthrough(),
})

const conditionsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/conditions' }),
  schema: z
    .object({
      name: z.string(),
      category: z.string().optional(),
      evidence_level: z.string().optional(),
    })
    .passthrough(),
})

const dietsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/diets' }),
  schema: z
    .object({
      name: z.string(),
      description: z.string().optional(),
    })
    .passthrough(),
})

const substancesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/substances' }),
  schema: z
    .object({
      name: z.string(),
      formula: z.string().optional(),
      discovery_year: z.number().optional(),
      source_ingredient: z.string().optional(),
      benefit: z.string().optional(),
      sazon: z.string().optional(),
      sabor: z.string().optional(),
      textura: z.string().optional(),
      vitaminas: z.array(z.string()).optional(),
      compuestos: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      image: z.string().optional(),
      image_attribution: z.string().optional(),
      health_registry: z
        .array(
          z
            .object({
              condition: z.string(),
              mechanism: z.string().optional(),
              evidence_level: z.string().optional(),
              studies: z
                .array(
                  z.object({
                    title: z.string(),
                    source: z.string(),
                    year: z.number().optional(),
                    doi: z.string().optional(),
                  }),
                )
                .optional(),
            })
            .passthrough(),
        )
        .optional(),
    })
    .passthrough(),
})

const mixturesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/mixtures' }),
  schema: z
    .object({
      name: z.string(),
      ingredients: z.array(z.string()),
      active_compounds: z.array(z.string()).optional(),
      synergy_type: z.string().optional(),
      synergy_mechanism: z.string().optional(),
      contraindications: z.array(z.string()).optional(),
      evidence_level: z.string().optional(),
      sources: z.array(z.string()).optional(),
      studies: z
        .array(
          z.object({
            title: z.string(),
            source: z.string(),
            year: z.number().optional(),
            doi: z.string().optional(),
            url: z.string().optional(),
          }),
        )
        .optional(),
    })
    .passthrough(),
})

export const collections = {
  dishes: dishesCollection,
  tips: tipsCollection,
  ingredients: ingredientsCollection,
  vitamins: vitaminsCollection,
  conditions: conditionsCollection,
  diets: dietsCollection,
  substances: substancesCollection,
  mixtures: mixturesCollection,
}
