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
  // Linting and type-checking run as dedicated CI tasks; skip them here so
  // the production build doesn't OOM on the 1 GB deploy server.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // Trim webpack's peak memory during compilation — needed to fit the build
  // (73 routes incl. 50 guide pages) in the deploy server's 1 GB of RAM.
  experimental: {
    webpackMemoryOptimizations: true,
  },
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
  async rewrites() {
    return {
      beforeFiles: [
        // Next's static file server 404s any /public path containing a
        // dotfile segment (e.g. .well-known), so route Apple Pay's domain
        // verification file through a handler instead.
        {
          source: '/.well-known/apple-developer-merchantid-domain-association',
          destination: '/api/well-known/apple-pay-domain-association',
        },
      ],
    };
  },
};

export default nextConfig;
