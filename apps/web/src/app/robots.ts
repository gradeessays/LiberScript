import type { MetadataRoute } from 'next';
import { getServerEnv } from '@liberscript/core';

// Force per-request generation so APP_URL is read from the running
// container's env, not baked in at build time (the Docker build stage
// has no APP_URL, which would otherwise freeze this at the localhost default).
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getServerEnv().APP_URL;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/projects',
          '/settings',
          '/admin',
          '/api',
          '/get-started',
          '/sign-in',
          '/sign-up',
          '/reset-password',
          '/accept-invitation',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
