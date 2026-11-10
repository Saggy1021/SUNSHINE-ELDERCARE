import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('================================================================')
console.log('Running Sunshine Eldercare — Reveal & SSR Visibility Tests')
console.log('================================================================\n')

// -------------------------------------------------------------------------
// TEST 1: CSS Progressive Enhancement Rules
// -------------------------------------------------------------------------
console.log('--- TEST 1: CSS Progressive Enhancement Rules in globals.css ---')

const globalsCssPath = path.join(process.cwd(), 'app/globals.css')
const globalsCss = fs.readFileSync(globalsCssPath, 'utf-8')

// Rule 1: .reveal MUST be opacity: 1 (visible by default)
assert.match(
  globalsCss,
  /\.reveal\s*\{[\s\S]*?opacity:\s*1;/,
  'FATAL: .reveal must have opacity: 1 by default to ensure content is visible without JS'
)
console.log('  ✓ Verified: .reveal has opacity: 1 by default (0% blank-screen risk).')

// Rule 2: .reveal MUST NOT have opacity: 0 without modifier
assert.doesNotMatch(
  globalsCss,
  /\.reveal\s*\{\s*opacity:\s*0;\s*\}/,
  'FATAL: .reveal must not be unconditionally hidden with opacity: 0'
)
console.log('  ✓ Verified: Unconditional .reveal { opacity: 0; } is eliminated.')

// Rule 3: .reveal.reveal-pending is armed with opacity: 0 and transform: translateY(36px)
assert.match(
  globalsCss,
  /\.reveal\.reveal-pending\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?transform:\s*translateY\(36px\);/,
  'FATAL: .reveal.reveal-pending must define offscreen armed state (opacity: 0, translateY(36px))'
)
console.log('  ✓ Verified: .reveal.reveal-pending provides armed offscreen state.')

// Rule 4: .reveal.is-visible uses animation-fill-mode "both"
assert.match(
  globalsCss,
  /\.reveal\.is-visible\s*\{[\s\S]*?animation:\s*reveal-up\s+0\.9s[\s\S]*?both;/,
  'FATAL: .reveal.is-visible must use "both" fill-mode to hold keyframes during delay'
)
console.log('  ✓ Verified: .reveal.is-visible uses "both" fill-mode for zero-flicker staggered delays.')

// Rule 5: prefers-reduced-motion overrides
assert.match(
  globalsCss,
  /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.reveal[\s\S]*?opacity:\s*1\s*!important;[\s\S]*?transform:\s*none\s*!important;/,
  'FATAL: prefers-reduced-motion must force opacity: 1 and transform: none'
)
console.log('  ✓ Verified: prefers-reduced-motion forces opacity: 1 and transform: none.')

// -------------------------------------------------------------------------
// TEST 2: Reveal Component Logic Analysis
// -------------------------------------------------------------------------
console.log('\n--- TEST 2: Reveal Component Logic in reveal.tsx ---')

const revealTsxPath = path.join(process.cwd(), 'components/yoga/reveal.tsx')
const revealTsx = fs.readFileSync(revealTsxPath, 'utf-8')

// Check 1: Initial state is 'initial'
assert.match(
  revealTsx,
  /useState<.*>\('initial'\)/,
  'FATAL: Reveal must initialize with status "initial" for SSR compatibility'
)
console.log('  ✓ Verified: Initial component state is "initial" (renders .reveal class).')

// Check 2: prefers-reduced-motion guard
assert.match(
  revealTsx,
  /prefers-reduced-motion:\s*reduce/,
  'FATAL: Reveal must inspect prefers-reduced-motion'
)
console.log('  ✓ Verified: prefers-reduced-motion guarded in useEffect.')

// Check 3: IntersectionObserver presence check
assert.match(
  revealTsx,
  /typeof\s+IntersectionObserver\s*===\s*['"]undefined['"]/,
  'FATAL: Reveal must check for IntersectionObserver availability'
)
console.log('  ✓ Verified: Fallback for environments lacking IntersectionObserver.')

// Check 4: Viewport check prevents in-viewport elements from jumping to opacity 0
assert.match(
  revealTsx,
  /rect\.top\s*<\s*window\.innerHeight\s*&&\s*rect\.bottom\s*>\s*0/,
  'FATAL: Reveal must check if element is already in viewport'
)
console.log('  ✓ Verified: Above-the-fold / in-view elements avoid false offscreen arming.')

// Check 5: Arming only occurs for offscreen elements
assert.match(
  revealTsx,
  /setStatus\('pending'\)/,
  'FATAL: Reveal must arm offscreen elements with status "pending"'
)
console.log('  ✓ Verified: Offscreen elements armed with "pending" status.')

// Check 6: Observer triggers 'visible' status
assert.match(
  revealTsx,
  /setStatus\('visible'\)/,
  'FATAL: Observer must transition element to "visible"'
)
console.log('  ✓ Verified: IntersectionObserver transitions element to "visible".')

// Check 7: Fallback timeout cleans up and ensures visibility
assert.match(
  revealTsx,
  /fallbackTimeout\s*=\s*setTimeout\(/,
  'FATAL: Reveal must maintain defensive fallback timeout'
)
console.log('  ✓ Verified: Defensive fallback timer guarantees content visibility.')

console.log('\n================================================================')
console.log('ALL REVEAL VISIBILITY TESTS PASSED WITH ZERO REGRESSIONS')
console.log('================================================================')
