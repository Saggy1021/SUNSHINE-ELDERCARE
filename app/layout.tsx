import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cinzel, Cormorant_Garamond, Forum, Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from "@/components/yoga/navbar"
import { Footer } from "@/components/yoga/footer"
import { auth } from "@/auth"
import { CmsService } from "@/lib/services/cms"

const cinzel = Cinzel({
  variable: '--font-cinzel',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})
const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
})
const forum = Forum({
  variable: '--font-forum',
  subsets: ['latin'],
  weight: ['400'],
})
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Sunshine Eldercare — Compassionate Care for Seniors',
  description:
    'Sunshine Eldercare provides comprehensive, compassionate care and companionship for seniors. Experience peace of mind with our dedicated eldercare programs.',
}

export const viewport: Viewport = {
  themeColor: '#3A2618',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [session, settingsMap] = await Promise.all([
    auth(),
    CmsService.getSettingsMap().catch(() => ({}))
  ]);
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${cormorant.variable} ${forum.variable} ${inter.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <Navbar isAuthenticated={!!session?.user} />
        {children}
        <Footer settings={settingsMap} />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
