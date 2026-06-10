import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins/organization';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from '@liberscript/db';
import { getServerEnv } from '@liberscript/core';
import { ac, roles } from './permissions';
import { sendInvitationEmail, sendResetPasswordEmail, sendVerificationEmail } from './emails';

const env = getServerEnv();

const googleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  appName: 'Liberscript',
  baseURL: env.APP_URL,
  secret: env.AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  session: {
    // Cache the session in a signed cookie so most requests skip the DB lookup
    // entirely (big win when the DB is geographically distant). Sign-out and
    // session changes still invalidate it.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url);
    },
  },

  emailVerification: {
    sendOnSignUp: env.REQUIRE_EMAIL_VERIFICATION,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },

  ...(googleConfigured
    ? {
        socialProviders: {
          google: {
            clientId: env.GOOGLE_CLIENT_ID as string,
            clientSecret: env.GOOGLE_CLIENT_SECRET as string,
          },
        },
      }
    : {}),

  plugins: [
    organization({
      ac,
      roles,
      creatorRole: 'owner',
      sendInvitationEmail: async ({ email, organization: org, id }) => {
        const url = `${env.APP_URL}/accept-invitation/${id}`;
        await sendInvitationEmail(email, org.name, url);
      },
    }),
    // Must be last: bridges Set-Cookie headers into Next.js server actions.
    nextCookies(),
  ],
});

export type Auth = typeof auth;
export type Session = Auth['$Infer']['Session'];
