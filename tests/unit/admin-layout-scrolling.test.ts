import { readFileSync } from 'fs'
import { join } from 'path'

function runLayoutScrollingTests() {
  console.log('================================================================')
  console.log('Sunshine Eldercare — Admin Layout & Scrolling Architecture Tests')
  console.log('================================================================\n')

  const rootDir = join(__dirname, '../..')

  // TEST 1: WorkspaceShell layout classes
  console.log('--- TEST 1: WorkspaceShell Structure & Scroll Containers ---')
  const workspaceShellPath = join(rootDir, 'components/workspace/workspace-shell.tsx')
  const workspaceShellSrc = readFileSync(workspaceShellPath, 'utf8')

  // Check 1.1: Root container has flex-1, relative, min-h-screen, and NO h-screen overflow-hidden
  if (workspaceShellSrc.includes('flex flex-1 min-h-screen relative') && !workspaceShellSrc.includes('flex h-screen bg-[#FAF9F5] font-sans text-[#172033] overflow-hidden')) {
    console.log('  ✓ PASS: WorkspaceShell root uses flex-1 min-h-screen relative (no fixed h-screen overflow-hidden)')
  } else {
    throw new Error('WorkspaceShell root container still has h-screen or overflow-hidden')
  }

  // Check 1.2: Main container has NO overflow-auto (no nested scroll container)
  if (workspaceShellSrc.includes('<main className="flex-1 bg-[#FAF9F5] p-4 sm:p-6 lg:p-8 relative">')) {
    console.log('  ✓ PASS: <main> element does not have overflow-auto; scrolling is handled exclusively by document root')
  } else {
    throw new Error('<main> element must not have overflow-auto (causes nested scrollbars)')
  }

  // Check 1.3: Sidebar on desktop is sticky top-0 h-screen
  if (workspaceShellSrc.includes('lg:sticky lg:top-0 lg:h-screen')) {
    console.log('  ✓ PASS: Sidebar has lg:sticky lg:top-0 lg:h-screen for persistent navigation during vertical page scroll')
  } else {
    throw new Error('Sidebar missing lg:sticky lg:top-0 lg:h-screen')
  }

  // Check 1.4: Workspace Header has sticky top-0
  if (workspaceShellSrc.includes('z-20 sticky top-0')) {
    console.log('  ✓ PASS: Workspace header has sticky top-0 for persistent breadcrumb and mobile menu accessibility')
  } else {
    throw new Error('Workspace header missing sticky top-0')
  }

  // TEST 2: Onboarding Form absolute/sr-only element containment
  console.log('\n--- TEST 2: Admin Onboarding Form sr-only Positioning Containment ---')
  const onboardingFormPath = join(rootDir, 'app/admin/members/new/admin-onboarding-form.tsx')
  const onboardingFormSrc = readFileSync(onboardingFormPath, 'utf8')

  if (onboardingFormSrc.includes('className="cursor-pointer relative block"') && onboardingFormSrc.includes('className="cursor-pointer relative"')) {
    console.log('  ✓ PASS: All radio cards and checkbox options have relative containing blocks, preventing sr-only elements escaping to document root')
  } else {
    throw new Error('Onboarding form radio cards must have relative containing blocks')
  }

  // TEST 3: Public Navbar Isolation on Portals
  console.log('\n--- TEST 3: Public Navbar Portal Route Guarding ---')
  const navbarPath = join(rootDir, 'components/yoga/navbar.tsx')
  const navbarSrc = readFileSync(navbarPath, 'utf8')

  if (
    navbarSrc.includes('pathname?.startsWith(\'/admin\')') &&
    navbarSrc.includes('pathname?.startsWith(\'/dashboard\')') &&
    navbarSrc.includes('pathname?.startsWith(\'/employee\')') &&
    navbarSrc.includes('if (isPortal) return null')
  ) {
    console.log('  ✓ PASS: Public Navbar is cleanly unmounted on /admin, /dashboard, and /employee portal routes')
  } else {
    throw new Error('Navbar missing portal route suppression')
  }

  // TEST 4: Root Layout Footer Placement
  console.log('\n--- TEST 4: Root Layout Document Flow & Footer Terminal Anchor ---')
  const rootLayoutPath = join(rootDir, 'app/layout.tsx')
  const rootLayoutSrc = readFileSync(rootLayoutPath, 'utf8')

  if (
    rootLayoutSrc.includes('flex flex-col min-h-screen') &&
    rootLayoutSrc.includes('<div className="flex-1 flex flex-col min-w-0">') &&
    rootLayoutSrc.includes('<Footer settings={settingsMap} />')
  ) {
    console.log('  ✓ PASS: Root layout uses flex flex-col min-h-screen with flex-1 content wrapper; Footer terminates document naturally')
  } else {
    throw new Error('Root layout must structure body with flex flex-col min-h-screen and flex-1 children wrapper')
  }

  console.log('\n================================================================')
  console.log('ALL 4 ADMIN LAYOUT & SCROLLING TESTS PASSED (100%)')
  console.log('================================================================')
}

runLayoutScrollingTests()
