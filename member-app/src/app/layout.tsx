import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { SafeContainer } from '@/components/app-shell/safe-container';

export const metadata: Metadata = {
  title: 'Sunshine Eldercare — Member App',
  description: 'Official Mobile Progressive Web App for Sunshine Eldercare Members',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sunshine Care',
  },
  icons: {
    icon: '/icons/icon-192x192.svg',
    apple: '/icons/icon-192x192.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#091329',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
      </head>
      <body>
        <SafeContainer>{children}</SafeContainer>
      </body>
    </html>
  );
}

