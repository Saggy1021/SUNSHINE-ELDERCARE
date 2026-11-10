import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

async function runBrowserTests() {
  console.log('================================================================')
  console.log('Running Sunshine Eldercare — Headless Browser Reveal Tests')
  console.log('================================================================\n')

  const globalsCss = fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf-8')
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  })

  try {
    // -----------------------------------------------------------------------
    // TEST 1: JavaScript DISABLED
    // -----------------------------------------------------------------------
    console.log('--- TEST 1: Rendering with JavaScript DISABLED ---')
    const noJsContext = await browser.newContext({ javaScriptEnabled: false })
    const noJsPage = await noJsContext.newPage()

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${globalsCss}</style>
        </head>
        <body>
          <div id="hero" style="height: 100vh;">Hero Section</div>
          <div id="section-1" class="reveal">
            <h2>Certifications</h2>
            <p>Trust content</p>
          </div>
          <div id="section-2" class="reveal">
            <h2>Army Personnel Team</h2>
            <p>Team content</p>
          </div>
          <div id="section-3" class="reveal">
            <h2>Membership Plans</h2>
            <p>Pricing content</p>
          </div>
        </body>
      </html>
    `

    await noJsPage.setContent(htmlContent)

    const opacitiesNoJs = await noJsPage.evaluate(() => {
      const ids = ['section-1', 'section-2', 'section-3']
      return ids.map((id) => {
        const el = document.getElementById(id)
        if (!el) return null
        const style = window.getComputedStyle(el)
        return {
          id,
          opacity: style.opacity,
          display: style.display,
          visibility: style.visibility,
          transform: style.transform,
        }
      })
    })

    for (const item of opacitiesNoJs) {
      assert(item !== null, `Element ${item?.id} must exist`)
      assert.equal(item.opacity, '1', `Element ${item.id} must have opacity: 1 when JS is disabled`)
      assert.notEqual(item.visibility, 'hidden', `Element ${item.id} must not be hidden`)
      console.log(`  ✓ ${item.id}: computed opacity = ${item.opacity}, visibility = ${item.visibility} (VISIBLE)`)
    }
    console.log('  ✓ Verified: When JavaScript is DISABLED, all sections are 100% visible (0% blank-screen).\n')
    await noJsContext.close()

    // -----------------------------------------------------------------------
    // TEST 2: JavaScript ENABLED with Progressive Scroll Reveal
    // -----------------------------------------------------------------------
    console.log('--- TEST 2: Rendering with JavaScript ENABLED ---')
    const jsContext = await browser.newContext({ javaScriptEnabled: true })
    const jsPage = await jsContext.newPage()

    // HTML with the exact Reveal component lifecycle logic
    const htmlWithJs = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${globalsCss}</style>
        </head>
        <body>
          <div id="top-section" class="reveal" style="height: 100px;">
            <h2>Top Section (Above Fold)</h2>
          </div>
          <div style="height: 1200px;">Spacer</div>
          <div id="below-fold-section" class="reveal" style="height: 300px;">
            <h2>Below Fold Section</h2>
          </div>

          <script>
            // Simulate the Reveal component client-side lifecycle
            function initReveal(el) {
              if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                return;
              }
              if (typeof IntersectionObserver === 'undefined') {
                return;
              }
              const rect = el.getBoundingClientRect();
              const isAboveOrInView = rect.top < window.innerHeight && rect.bottom > 0;
              const isPast = rect.bottom <= 0;

              if (isAboveOrInView || isPast) {
                // In viewport on load: stay visible
                return;
              }

              // Offscreen below fold: arm pending state
              el.classList.add('reveal-pending');

              const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                  if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight) {
                    el.classList.remove('reveal-pending');
                    el.classList.add('is-visible');
                    observer.unobserve(entry.target);
                  }
                });
              }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

              observer.observe(el);
            }

            document.querySelectorAll('.reveal').forEach(initReveal);
          </script>
        </body>
      </html>
    `

    await jsPage.setContent(htmlWithJs)

    // 1. Check top section (above fold): must be opacity 1 immediately
    const topSectionStyle = await jsPage.evaluate(() => {
      const el = document.getElementById('top-section')
      const style = window.getComputedStyle(el)
      return {
        opacity: style.opacity,
        classList: Array.from(el.classList),
      }
    })
    assert.equal(topSectionStyle.opacity, '1', 'Top section in viewport must be opacity: 1')
    assert.equal(topSectionStyle.classList.includes('reveal-pending'), false, 'Top section must not have reveal-pending')
    console.log(`  ✓ Top section (in viewport): opacity = ${topSectionStyle.opacity}, classes = [${topSectionStyle.classList.join(', ')}] (NO BLANK DELAY)`)

    // 2. Check below fold section: must be armed with reveal-pending
    const belowFoldStyle = await jsPage.evaluate(() => {
      const el = document.getElementById('below-fold-section')
      const style = window.getComputedStyle(el)
      return {
        opacity: style.opacity,
        classList: Array.from(el.classList),
      }
    })
    assert.equal(belowFoldStyle.opacity, '0', 'Below-fold section must be armed with opacity: 0 while offscreen')
    assert.equal(belowFoldStyle.classList.includes('reveal-pending'), true, 'Below-fold section must have reveal-pending')
    console.log(`  ✓ Below-fold section (offscreen): opacity = ${belowFoldStyle.opacity}, classes = [${belowFoldStyle.classList.join(', ')}] (ARMED OFFSCREEN)`)

    // 3. Scroll to below fold section
    console.log('  * Scrolling to below-fold section...')
    await jsPage.evaluate(() => {
      document.getElementById('below-fold-section').scrollIntoView()
    })
    await jsPage.waitForTimeout(300)

    const scrolledStyle = await jsPage.evaluate(() => {
      const el = document.getElementById('below-fold-section')
      const style = window.getComputedStyle(el)
      return {
        opacity: style.opacity,
        classList: Array.from(el.classList),
        animationName: style.animationName,
      }
    })
    assert.equal(scrolledStyle.classList.includes('is-visible'), true, 'Below-fold section must have is-visible after scroll')
    assert.equal(scrolledStyle.classList.includes('reveal-pending'), false, 'Below-fold section must remove reveal-pending')
    assert.equal(scrolledStyle.animationName, 'reveal-up', 'Below-fold section must trigger reveal-up animation')
    console.log(`  ✓ Below-fold section (after scroll): classes = [${scrolledStyle.classList.join(', ')}], animation = ${scrolledStyle.animationName}`)

    await jsContext.close()

    // -----------------------------------------------------------------------
    // TEST 3: prefers-reduced-motion: reduce
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 3: prefers-reduced-motion: reduce ---')
    const reducedMotionContext = await browser.newContext({
      reducedMotion: 'reduce',
      javaScriptEnabled: true,
    })
    const rmPage = await reducedMotionContext.newPage()
    await rmPage.setContent(htmlWithJs)

    const rmStyles = await rmPage.evaluate(() => {
      const top = window.getComputedStyle(document.getElementById('top-section'))
      const below = window.getComputedStyle(document.getElementById('below-fold-section'))
      return {
        topOpacity: top.opacity,
        belowOpacity: below.opacity,
        topTransform: top.transform,
        belowTransform: below.transform,
      }
    })

    assert.equal(rmStyles.topOpacity, '1', 'Top section must have opacity: 1 under reduced motion')
    assert.equal(rmStyles.belowOpacity, '1', 'Below-fold section must have opacity: 1 under reduced motion')
    console.log(`  ✓ Reduced motion: topOpacity = ${rmStyles.topOpacity}, belowOpacity = ${rmStyles.belowOpacity} (NO MOTION / FULL VISIBILITY)`)

    await reducedMotionContext.close()

    console.log('\n================================================================')
    console.log('ALL BROWSER REVEAL TESTS PASSED (NO-JS, JS, REDUCED-MOTION)')
    console.log('================================================================')
  } finally {
    await browser.close()
  }
}

runBrowserTests().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
