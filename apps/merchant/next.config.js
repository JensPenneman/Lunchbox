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
  ],
  experimental: { externalDir: true },
};

module.exports = nextConfig;
