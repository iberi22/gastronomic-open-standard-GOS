/**
 * GOS PWA Verification Script
 * Run: node scripts/test-pwa.cjs
 *
 * Checks:
 *   - sw.js exists and has required caching strategies
 *   - manifest.json is valid JSON and has required fields
 *   - Required PWA icons exist
 *   - No syntax errors in sw.js
 */

const fs = require('node:fs')
const path = require('node:path')

const SITE_ROOT = path.join(__dirname, '..')
const PUBLIC_ROOT = path.join(SITE_ROOT, 'public')

const PASS = '✅'
const FAIL = '❌'
const WARN = '⚠️'

let exitCode = 0

function log(label, status, msg) {
  const color =
    status === FAIL ? '\x1b[31m' : status === WARN ? '\x1b[33m' : '\x1b[32m'
  const reset = '\x1b[0m'
  console.log(`${color}${status}${reset} ${label}: ${msg}`)
  if (status === FAIL) exitCode = 1
}

function checkFile(relPath, label) {
  const fullPath = path.join(PUBLIC_ROOT, relPath)
  if (!fs.existsSync(fullPath)) {
    log(label, FAIL, `Not found: ${relPath}`)
    return null
  }
  log(label, PASS, `Found: ${relPath}`)
  return fullPath
}

// 1. Verify sw.js
function checkServiceWorker() {
  console.log('\n--- Service Worker ---')
  const swPath = checkFile('sw.js', 'sw.js')
  if (!swPath) return

  const code = fs.readFileSync(swPath, 'utf8')

  // Syntax check (basic eval)
  try {
    // Remove comments for basic check
    const stripped = code
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
    new Function(stripped)
    log('Syntax', PASS, 'No syntax errors')
  } catch (e) {
    log('Syntax', FAIL, e.message)
  }

  const checks = [
    {
      key: 'install',
      test: (c) =>
        c.includes("addEventListener('install'") ||
        c.includes('addEventListener("install"'),
      label: 'install event',
    },
    {
      key: 'activate',
      test: (c) =>
        c.includes("addEventListener('activate'") ||
        c.includes('addEventListener("activate"'),
      label: 'activate event',
    },
    {
      key: 'fetch',
      test: (c) =>
        c.includes("addEventListener('fetch'") ||
        c.includes('addEventListener("fetch"'),
      label: 'fetch event',
    },
    {
      key: 'cacheFirst',
      test: (c) => c.includes('cacheFirst') || c.includes('cache first'),
      label: 'cache-first strategy',
    },
    {
      key: 'networkFirst',
      test: (c) => c.includes('networkFirst') || c.includes('network first'),
      label: 'network-first strategy',
    },
    {
      key: 'staleWhileRevalidate',
      test: (c) =>
        c.includes('staleWhileRevalidate') || c.includes('stale while'),
      label: 'stale-while-revalidate strategy',
    },
    {
      key: 'CACHE_NAME',
      test: (c) => c.includes('CACHE_NAME'),
      label: 'cache name constant',
    },
    {
      key: 'skipWaiting',
      test: (c) => c.includes('skipWaiting'),
      label: 'skipWaiting call',
    },
  ]

  checks.forEach(({ test, label }) => {
    log(label, test(code) ? PASS : FAIL, test(code) ? 'Present' : 'Missing')
  })
}

// 2. Verify manifest.json
function checkManifest() {
  console.log('\n--- manifest.json ---')
  const manifestPath = checkFile('manifest.json', 'manifest.json')
  if (!manifestPath) return

  let manifest
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8')
    manifest = JSON.parse(raw)
    log('JSON parse', PASS, 'Valid JSON')
  } catch (e) {
    log('JSON parse', FAIL, e.message)
    return
  }

  const required = [
    'name',
    'short_name',
    'start_url',
    'display',
    'background_color',
    'theme_color',
    'icons',
  ]
  required.forEach((field) => {
    const val = manifest[field]
    if (val !== undefined && val !== null && val !== '') {
      log(
        field,
        PASS,
        val === '' ? 'empty string' : String(val).substring(0, 50),
      )
    } else {
      log(field, FAIL, 'Missing or empty')
    }
  })

  // Check icons array
  if (Array.isArray(manifest.icons) && manifest.icons.length > 0) {
    log('icons array', PASS, `${manifest.icons.length} icon(s) defined`)
    manifest.icons.forEach((icon, i) => {
      if (icon.src) {
        log(`icon[${i}] src`, PASS, icon.src)
      } else {
        log(`icon[${i}] src`, FAIL, 'Missing src')
      }
    })
  } else {
    log('icons array', FAIL, 'Missing or empty icons array')
  }
}

// 3. Check PWA icons exist
function checkIcons() {
  console.log('\n--- PWA Icons ---')
  const icons = [
    { path: 'icons/icon-192.png', label: 'icon-192.png' },
    { path: 'icons/icon-192.svg', label: 'icon-192.svg' },
    { path: 'icons/icon-512.png', label: 'icon-512.png' },
    { path: 'icons/icon-512.svg', label: 'icon-512.svg' },
    { path: 'icons/icon-maskable.svg', label: 'icon-maskable.svg' },
    { path: 'images/favicon.png', label: 'favicon.png (192x192 fallback)' },
  ]

  icons.forEach(({ path: p, label }) => {
    checkFile(p, label)
  })
}

// 4. Verify sw.js caching strategies are present
function checkCachingStrategies() {
  console.log('\n--- Caching Strategy Coverage ---')
  const swPath = path.join(PUBLIC_ROOT, 'sw.js')
  if (!fs.existsSync(swPath)) {
    log('Coverage', FAIL, 'sw.js not found')
    return
  }

  const code = fs.readFileSync(swPath, 'utf8')

  // Check that different resource types use appropriate strategies
  const resourceChecks = [
    {
      pattern:
        /request\.destination\s*===\s*['"]style['"]|request\.destination\s*===\s*['"]script['"]|request\.destination\s*===\s*['"]image['"]|request\.destination\s*===\s*['"]font['"]/,
      label: 'Static assets use Cache First',
      test: 'static-cache',
    },
    {
      pattern:
        /pathname\.startsWith\s*\(\s*['"]\/api\/['"]\s*\)|hostname\.includes\s*\(\s*['"]github\.com['"]\s*\)/,
      label: 'API/GitHub use Network First',
      test: 'api-network',
    },
    {
      pattern: /request\.destination\s*===\s*['"]document['"]|HTML pages/i,
      label: 'HTML uses Stale While Revalidate',
      test: 'html-swr',
    },
  ]

  resourceChecks.forEach(({ pattern, label }) => {
    const found = pattern.test(code)
    log(
      label,
      found ? PASS : WARN,
      found ? 'Strategy found' : 'Strategy not clearly identified',
    )
  })
}

// Main
console.log('=================================')
console.log(' GOS PWA Verification Script v1.0')
console.log('=================================')

checkServiceWorker()
checkManifest()
checkIcons()
checkCachingStrategies()

console.log('\n=================================')
if (exitCode === 0) {
  console.log(' All checks passed!')
} else {
  console.log(' Some checks failed. Review output above.')
}
console.log('=================================')

process.exit(exitCode)
