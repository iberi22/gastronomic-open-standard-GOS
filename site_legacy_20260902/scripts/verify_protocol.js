import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DISHES_DIR = path.join(__dirname, '../../dishes');
const REQUIRED_SECTIONS = [
  'Análisis Detallado y Sabiduría Colectiva',
  'Perfil Sensorial Estandarizado',
  'Contexto Socio-Cultural y Saberes Ancestrales'
];

let hasErrors = false;

function scanDirectory(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (file.endsWith('.md') && !file.includes('README')) {
        checkFile(fullPath);
      }
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`❌ Directory not found: ${dir}`);
      hasErrors = true;
    } else {
      throw err;
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.startsWith('---')) return;

  const missing = [];
  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      missing.push(section);
    }
  }

  // STRICT TARGET LIST
  const isTarget =
      filePath.includes('ajiaco_santafereño') ||
      filePath.includes('bandeja_paisa') ||
      filePath.includes('lechona_tolimense') ||
      filePath.includes('sancocho_costeño') ||
      filePath.includes('mute_santandereano') ||
      (filePath.includes('empanada.md') && !filePath.includes('jaiba')) ||
      filePath.includes('mondongo_antioqueño') ||
      filePath.includes('arepa_de_huevo') ||
      (filePath.includes('cazuela_de_mariscos') && filePath.includes('caribe'));

  if (missing.length > 0) {
    if (isTarget) {
      console.error(`❌ [FAIL] ${path.basename(filePath)} is missing: ${missing.join(', ')}`);
      hasErrors = true;
    }
  } else if (isTarget) {
      console.log(`✅ [PASS] ${path.basename(filePath)}`);
  }
}

console.log(`🔍 Verifying Scientific Protocol Compliance in: ${DISHES_DIR}`);
scanDirectory(DISHES_DIR);

if (hasErrors) {
  console.error("\n⛔ Compliance check FAILED. Fix errors before committing.");
  process.exit(1);
} else {
  console.log("\n✅ Compliance check PASSED.");
}
