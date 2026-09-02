import fs from 'fs';
import path from 'path';

const recipesDir = 'site/src/content/recipes';
if (!fs.existsSync(recipesDir)) fs.mkdirSync(recipesDir, { recursive: true });

// Test 1: Same folder
fs.writeFileSync(path.join(recipesDir, 'test1.md'), '# Test 1\n![Test](test1.jpg)');
fs.copyFileSync('site/src/content/recipes/colombian/nacionales/img/chorizo-2314640_640.jpg', path.join(recipesDir, 'test1.jpg'));

// Test 2: Subfolder
const subDir = path.join(recipesDir, 'sub');
const imgDir = path.join(subDir, 'img');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

fs.writeFileSync(path.join(subDir, 'test2.md'), '# Test 2\n![Test](img/test2.jpg)');
fs.copyFileSync('site/src/content/recipes/colombian/nacionales/img/chorizo-2314640_640.jpg', path.join(imgDir, 'test2.jpg'));

console.log('Created test files.');
