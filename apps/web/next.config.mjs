/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Linting runs as a dedicated `turbo lint` task (with the Next.js plugin),
  // so skip Next's redundant build-time lint pass.
  eslint: { ignoreDuringBuilds: true },
  // Internal workspace packages ship TypeScript source; let Next transpile them.
  transpilePackages: [
    '@liberscript/core',
    '@liberscript/db',
    '@liberscript/jobs',
    '@liberscript/ui',
    '@liberscript/auth',
  ],
  // Node-only packages — keep them external instead of bundling into the server.
  // better-auth pulls in optional kysely/sqlite dialects that must not be bundled.
  serverExternalPackages: [
    'bullmq',
    'ioredis',
    '@prisma/client',
    'better-auth',
    '@better-auth/kysely-adapter',
    'kysely',
    'nodemailer',
  ],
};

export default nextConfig;
