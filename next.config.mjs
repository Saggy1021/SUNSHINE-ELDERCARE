const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    
    // Next.js App Router relies on 'unsafe-inline' for scripts unless a complex middleware nonce system is used.
    // To avoid breaking the current architecture, we scope it to 'self' and 'unsafe-inline'.
    // Next.js dev server requires 'unsafe-eval' for hot reloading.
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com ${isDev ? "'unsafe-eval'" : ""};
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data:;
      font-src 'self';
      connect-src 'self' https://vitals.vercel-insights.com https://api.razorpay.com;
      object-src 'none';
      frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com;
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      ${isDev ? '' : 'upgrade-insecure-requests;'}
    `;

    const headers = [
      {
        key: 'Content-Security-Policy',
        value: cspHeader.replace(/\n/g, '').replace(/\s+/g, ' ').trim()
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY'
      }
    ];

    // HSTS is production-only to prevent localhost lockout during dev
    if (!isDev) {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains'
      });
    }

    return [
      {
        source: '/(.*)',
        headers
      }
    ];
  },
  async redirects() {
    return [
      {
        source: '/admin/login',
        destination: '/login?callbackUrl=/admin',
        permanent: false,
      },
    ];
  }
}

export default nextConfig
