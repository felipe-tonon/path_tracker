/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },
  eslint: {
    // Ignore ESLint during production builds (CI/CD)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript errors should still be caught
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
