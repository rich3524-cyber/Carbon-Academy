import type { NextConfig } from 'next'
import { publicHeaderSource, securityHeaders } from './src/config/security-headers'

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  // The certificate PDF reads its embedded font at request time (plan Task 5).
  outputFileTracingIncludes: {
    '/certificates/[number]': ['./src/lib/certificates/fonts/**'],
  },
  // Security framework section 4, "Build and release configuration"
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    const all = securityHeaders(process.env.NODE_ENV === 'development')
    const isCsp = (header: { key: string }) => header.key === 'Content-Security-Policy-Report-Only'
    return [
      { source: '/:path*', headers: all.filter((header) => !isCsp(header)) },
      // Account pages get a per-request nonce CSP from src/proxy.ts instead.
      { source: publicHeaderSource, headers: all.filter(isCsp) },
    ]
  },
}

export default nextConfig
