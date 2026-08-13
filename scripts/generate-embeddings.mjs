import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { pipeline } from '@xenova/transformers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root of the repo (parent of scripts/)
const repoRoot = path.resolve(__dirname, '../');
const dishesDir = path.join(repoRoot, 'dishes');
const ingredientsDir = path.join(repoRoot, 'ingredients');

// Support CLI outputFilename argument
let outputFilename = path.join(repoRoot, 'site/public/data/embeddings.json');

for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === '--outputFilename' || process.argv[i] === '-o') {
    outputFilename = process.argv[i + 1];
  } else if (process.argv[i].startsWith('--outputFilename=')) {
    outputFilename = process.argv[i].split('=')[1];
  }
}

// Make sure output filename is resolved to an absolute path if relative
if (!path.isAbsolute(outputFilename)) {
  outputFilename = path.resolve(process.cwd(), outputFilename);
}

console.log(`Writing embeddings to: ${outputFilename}`);

// Recursive function to find md files
function findMdFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findMdFiles(filePath, fileList);
    } else if (
      stat.isFile() &&
      file.endsWith('.md') &&
      file !== 'README.md' &&
      file !== '_template.md' &&
      file !== 'COLOMBIAN_RECIPES_PLAN.md' &&
      file !== 'RECIPE_METADATA_AUDIT.md' &&
      file !== 'GRAPH_INTERCONNECTIONS_AUDIT.md' &&
      file !== 'SENSORY_DATA_TODO.md'
    ) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const itemsToEmbed = [];

// 1. Process Dishes/Recipes
console.log('Scanning dishes...');
const dishesFiles = findMdFiles(dishesDir);
console.log(`Found ${dishesFiles.length} dishes files.`);

for (const filePath of dishesFiles) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content: body } = matter(fileContent);

    // Astro-compatible slug is the path relative to dishes/ directory, without extension
    const slug = path.relative(dishesDir, filePath).replace(/\\/g, '/').replace(/\.md$/, '');

    const title = data.title || path.basename(filePath, '.md');

    let description = data.description || '';
    if (!description) {
      const paragraphs = body.split('\n').map(p => p.trim()).filter(p => p.length > 0 && !p.startsWith('#') && !p.startsWith('-'));
      if (paragraphs.length > 0) {
        description = paragraphs[0];
      }
    }

    // Extract ingredients
    const mainIngredients = Array.isArray(data.main_ingredients) ? data.main_ingredients : [];
    const bodyIngredients = [];
    const ingredientsSection = body.split(/##\s*(?:Ingredientes|Ingredients)/i)[1];
    if (ingredientsSection) {
      const relevantPart = ingredientsSection.split(/^#/m)[0];
      const matches = relevantPart.match(/^\s*-\s+(.+)$/gm);
      if (matches) {
        matches.forEach(line => {
          bodyIngredients.push(line.replace(/^\s*-\s+/, '').trim());
        });
      }
    }
    const allIngredients = [...new Set([...mainIngredients, ...bodyIngredients])];

    // Extract instructions
    let instructions = '';
    const instructionsSection = body.split(/##\s*(?:Instrucciones|Instructions)/i)[1];
    if (instructionsSection) {
      instructions = instructionsSection.split(/^#/m)[0].trim();
    } else {
      instructions = body.trim();
    }

    // Prepare text for model
    const textToEmbed = `Title: ${title}. Description: ${description}. Ingredients: ${allIngredients.join(', ')}. Instructions: ${instructions}`;

    itemsToEmbed.push({
      id: `recipe:${slug}`,
      slug,
      title,
      type: 'recipe',
      category: data.region || slug.split('/')[0] || '',
      excerpt: description,
      text: textToEmbed
    });
  } catch (error) {
    console.error(`Error parsing dish ${filePath}:`, error);
  }
}

// 2. Process Ingredients
console.log('Scanning ingredients...');
const ingredientsFiles = findMdFiles(ingredientsDir);
console.log(`Found ${ingredientsFiles.length} ingredients files.`);

for (const filePath of ingredientsFiles) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content: body } = matter(fileContent);

    // Ingredient slug
    const slug = path.relative(ingredientsDir, filePath).replace(/\\/g, '/').replace(/\.md$/, '');

    const name = data.name || path.basename(filePath, '.md');
    const category = data.group || data.category || '';

    let description = data.description || '';
    if (!description) {
      const descSection = body.split(/##\s*(?:Description|Descripción)/i)[1];
      if (descSection) {
        description = descSection.split(/^#/m)[0].trim();
      } else {
        const paragraphs = body.split('\n').map(p => p.trim()).filter(p => p.length > 0 && !p.startsWith('#') && !p.startsWith('-'));
        if (paragraphs.length > 0) {
          description = paragraphs[0];
        } else {
          description = body.trim();
        }
      }
    }

    const textToEmbed = `Name: ${name}. Category: ${category}. Description: ${description}`;

    itemsToEmbed.push({
      id: `ingredient:${slug}`,
      slug,
      title: name,
      type: 'ingredient',
      category,
      excerpt: description,
      text: textToEmbed
    });
  } catch (error) {
    console.error(`Error parsing ingredient ${filePath}:`, error);
  }
}

// 3. Embedding Generation
console.log(`Total items to embed: ${itemsToEmbed.length}`);
console.log('Loading transformer model Xenova/all-MiniLM-L6-v2...');
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
console.log('Model loaded successfully.');

const batchSize = 32;
const result = [];

for (let i = 0; i < itemsToEmbed.length; i += batchSize) {
  const batch = itemsToEmbed.slice(i, i + batchSize);
  const texts = batch.map(item => item.text);

  console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(itemsToEmbed.length / batchSize)}...`);

  try {
    const outputs = await extractor(texts, { pooling: 'mean', normalize: true });
    const dim = outputs.dims[1];

    for (let j = 0; j < batch.length; j++) {
      const start = j * dim;
      const end = start + dim;
      const embedding = Array.from(outputs.data.slice(start, end));

      const { text, ...metadata } = batch[j];
      result.push({
        ...metadata,
        embedding
      });
    }
  } catch (error) {
    console.error(`Failed to generate embeddings for batch starting at ${i}:`, error);
  }
}

console.log(`Generated ${result.length} embeddings. Writing output...`);
const outputDir = path.dirname(outputFilename);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputFilename, JSON.stringify(result, null, 2) + '\n');
console.log('Embeddings generated and saved successfully.');
