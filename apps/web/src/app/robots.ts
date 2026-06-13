import type { MetadataRoute } from 'next';
import { getServerEnv } from '@liberscript/core';

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
