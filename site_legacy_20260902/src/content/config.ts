import { defineCollection, z } from 'astro:content';

const dishesCollection = defineCollection({
  type: 'content',
  // schema: z.object({ ... }).passthrough(),
  schema: z.any(),
});

const tipsCollection = defineCollection({
  type: 'content',
  schema: z.object({}).passthrough(),
});

const ingredientsCollection = defineCollection({
  type: 'content',
  schema: z.object({
      name: z.string(),
      group: z.string().optional(),
      image: z.string().optional(),
  }).passthrough(),
});

export const collections = {
  'dishes': dishesCollection,
  'tips': tipsCollection,
  'ingredients': ingredientsCollection,
};
