/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@lunchbox/ui',
    '@lunchbox/contracts',
    '@lunchbox/trpc-client',
    '@lunchbox/trpc-server',
    '@lunchbox/auth',
    '@lunchbox/db',
    '@lunchbox/i18n',
  ],
  experimental: {
    externalDir: true,
  },
  typescript: {
    // Nx + Next path aliases sometimes need the whole workspace available
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
