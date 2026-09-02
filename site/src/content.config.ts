import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const dishesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/dishes' }),
  schema: z.object({}).passthrough(),
});

const tipsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tips' }),
  schema: z.object({}).passthrough(),
});

const ingredientsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/ingredients' }),
  schema: z.object({
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
  }).passthrough(),
});

const vitaminsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/vitamins' }),
  schema: z.object({
    code: z.string().optional(),
    name: z.string().optional(),
    group: z.string().optional(),
    unit: z.string().optional(),
  }).passthrough(),
});

const conditionsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/conditions' }),
  schema: z.object({
    name: z.string(),
    category: z.string().optional(),
    evidence_level: z.string().optional(),
  }).passthrough(),
});

const dietsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/diets' }),
  schema: z.object({
    name: z.string(),
    description: z.string().optional(),
  }).passthrough(),
});

const substancesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/substances' }),
  schema: z.object({
    name: z.string(),
    discovery_year: z.number().optional(),
    benefit: z.string().optional(),
  }).passthrough(),
});

export const collections = {
  'dishes': dishesCollection,
  'tips': tipsCollection,
  'ingredients': ingredientsCollection,
  'vitamins': vitaminsCollection,
  'conditions': conditionsCollection,
  'diets': dietsCollection,
  'substances': substancesCollection,
};
