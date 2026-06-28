/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow serverless functions to use Prisma with Neon adapter
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', '@neondatabase/serverless'],
  },
};

module.exports = nextConfig;
