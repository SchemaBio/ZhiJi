/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  async redirects() {
    return [
      { source: '/analysis', destination: '/tasks', permanent: false },
      { source: '/analysis/new', destination: '/tasks', permanent: false },
      { source: '/analysis/pending', destination: '/tasks?status=pending_interpretation', permanent: false },
      { source: '/analysis/running', destination: '/tasks?status=running', permanent: false },
      { source: '/analysis/completed', destination: '/tasks?status=completed', permanent: false },
      { source: '/analysis/:uuid', destination: '/tasks/:uuid', permanent: false },
      { source: '/settings/permissions', destination: '/admin', permanent: false },
      { source: '/settings/ai', destination: '/settings', permanent: false },
      { source: '/pipeline/config', destination: '/pipeline', permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: '/runtime-config.js',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/:path*',
        headers: [
          ...(isProduction
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
