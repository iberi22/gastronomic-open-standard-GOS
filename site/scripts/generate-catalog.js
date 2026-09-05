import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '../../');
const dishesDir = path.join(repoRoot, 'dishes');
const outputDir = path.resolve(__dirname, '../public/api/by-country');
const outputFile = path.join(outputDir, 'catalog.json');

function getMarkdownFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getMarkdownFiles(filePath));
    } else if (file.endsWith('.md')) {
      results.push(filePath);
    }
  });
  return results;
}

function generateCatalog() {
  console.log('Generating country catalog JSON API...');

  if (!fs.existsSync(dishesDir)) {
    console.error(`Dishes directory not found at ${dishesDir}`);
    process.exit(1);
  }

  const files = getMarkdownFiles(dishesDir);
  const catalogMap = {};

  files.forEach(file => {
    const relativePath = path.relative(dishesDir, file).replace(/\\/g, '/');
    const parts = relativePath.split('/');
    const country = parts[0];

    if (country.toLowerCase() === 'china' || /[\u4e00-\u9fa5]/.test(country)) {
      return;
    }

    const content = fs.readFileSync(file, 'utf8');
    const parsed = matter(content);
    const data = parsed.data || {};

    if (!data.title) {
      console.warn(`Warning: Missing title in ${file}`);
    }

    if (!catalogMap[country]) {
      catalogMap[country] = {
        country,
        count: 0,
        recipes: []
      };
    }

    catalogMap[country].count++;
    catalogMap[country].recipes.push({
      id: relativePath.replace(/\.md$/, ''),
      title: data.title || path.basename(file, '.md'),
      region: data.region || 'Nacional',
      difficulty: data.difficulty || 'Media'
    });
  });

  const catalogList = Object.values(catalogMap).sort((a, b) => b.count - a.count);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, JSON.stringify(catalogList, null, 2), 'utf8');
  console.log(`Successfully generated ${outputFile} with ${catalogList.length} countries.`);
}

generateCatalog();
