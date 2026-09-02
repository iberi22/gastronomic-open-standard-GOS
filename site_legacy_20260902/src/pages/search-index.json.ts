import { getCollection } from 'astro:content';

export async function GET() {
  const recipes = await getCollection('dishes');
  const ingredients = await getCollection('ingredients');

  function findImage(recipe: any) {
      const body = recipe.body;
      let imagePath = null;
      const mdMatch = body.match(/!\[.*?\]\(((?:[^()]+|\([^()]*\))+)\)/);
      if (mdMatch && !mdMatch[1].endsWith('.svg')) {
         imagePath = mdMatch[1];
      } else {
         const htmlMatch = body.match(/<img.*?src=["'](.*?)["']/);
         if (htmlMatch && !htmlMatch[1].endsWith('.svg')) {
            imagePath = htmlMatch[1];
         }
      }

      if (!imagePath) return undefined;

      if (imagePath.match(/^https?:\/\//)) {
          return imagePath;
      }

      if (imagePath.startsWith('./') || !imagePath.startsWith('/')) {
         const cleanPath = imagePath.replace(/^\.\//, '');
         const lastSlashIndex = recipe.id.lastIndexOf('/');
         const dir = lastSlashIndex !== -1 ? recipe.id.substring(0, lastSlashIndex) : '';
         return `${import.meta.env.BASE_URL}/dishes/${dir}/${cleanPath}`.replace(/\/+/g, '/');
      }

      return imagePath;
  }

  function getIngredients(body: any) {
     // Extract ingredients from markdown list under "Ingredientes"
     const ingredientsSection = body.split(/##\s*Ingredientes/i)[1];
     if (!ingredientsSection) return [];

     // Stop at next header
     const relevantPart = ingredientsSection.split(/^#/m)[0];

     // Extract list items
     const matches = relevantPart.match(/^\s*-\s+(.+)$/gm);
     if (!matches) return [];

     return matches.map((line: string) => line.replace(/^\s*-\s+/, '').trim());
  }

  const searchIndex = recipes.map(recipe => ({
    title: recipe.data.title || recipe.slug.split('/').pop(),
    slug: recipe.slug,
    category: recipe.slug.split('/')[0],
    image: findImage(recipe),
    region: recipe.data.region,
    ingredients: getIngredients(recipe.body).join(' ').toLowerCase(),
    // Include full body for comprehensive search? Or just specific fields?
    // Let's stick to ingredients for now as requested.
  }));

  return new Response(JSON.stringify(searchIndex), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
