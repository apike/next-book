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
      // 10 years
      maxAge: 60 * 60 * 24 * 365 * 10,
    });
  }

  return response;
}

// Only run middleware on poll pages (where we need sessions)
export const config = {
  matcher: '/poll/:path*',
};
