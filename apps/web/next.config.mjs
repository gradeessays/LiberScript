import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained production server for Docker (copies only traced files). The
  // tracing root is the monorepo root so workspace packages are bundled in.
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Linting runs as a dedicated `turbo lint` task (with the Next.js plugin),
  // so skip Next's redundant build-time lint pass.
  eslint: { ignoreDuringBuilds: true },
  // Internal workspace packages ship TypeScript source; let Next transpile them.
  transpilePackages: [
    '@liberscript/analysis',
    '@liberscript/core',
    '@liberscript/db',
    '@liberscript/jobs',
    '@liberscript/ui',
    '@liberscript/auth',
    '@liberscript/format',
  ],
  // Node-only packages — keep them external instead of bundling into the server.
  // better-auth pulls in optional kysely/sqlite dialects that must not be bundled;
  // the AWS SDK (@smithy/*) is large and server-only.
  serverExternalPackages: [
    'bullmq',
    'ioredis',
    '@prisma/client',
    'better-auth',
    '@better-auth/kysely-adapter',
    'kysely',
    'nodemailer',
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner',
  ],
};

export default nextConfig;
