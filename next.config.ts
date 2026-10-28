import type { NextConfig } from 'next'
import { securityHeaders } from './src/config/security-headers'

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
  // Security framework section 4, "Build and release configuration"
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders(process.env.NODE_ENV === 'development'),
      },
    ]
  },
}

export default nextConfig
