import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'bookpoll_session';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Check if session cookie exists
  const existingSession = request.cookies.get(SESSION_COOKIE_NAME);

  if (!existingSession) {
    // Generate new session ID and set cookie
    const newSessionId = crypto.randomUUID();
    
    response.cookies.set(SESSION_COOKIE_NAME, newSessionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      // 10 years
      maxAge: 60 * 60 * 24 * 365 * 10,
    });
  }

  return response;
}

// Run wherever anonymous browser sessions or passkey auth can be used.
export const config = {
  matcher: ['/', '/poll/:path*', '/club/:path*', '/api/:path*'],
};
