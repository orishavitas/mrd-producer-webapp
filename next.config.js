/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Use SWC for faster builds with broad browser support
  swcMinify: true,

  // Compiler options for cross-browser compatibility
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Transpile packages that might have modern JS
  transpilePackages: [],

  // Image optimization with broad format support
  images: {
    formats: ['image/webp', 'image/avif'],
    // Fallback to original format for older browsers
    dangerouslyAllowSVG: true,
  },

  // Headers for cross-browser compatibility
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
