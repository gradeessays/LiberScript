import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// Routes that exist purely to onboard logged-out visitors. A logged-in
// session has nothing to do here, so bounce straight to the dashboard
// (avoids users getting "stuck" on marketing/auth pages after signing in).
export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (sessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/pricing', '/sign-in', '/sign-up', '/reset-password'],
};
