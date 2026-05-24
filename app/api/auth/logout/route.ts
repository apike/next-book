import { NextResponse } from 'next/server';
import { saveSession } from '@/lib/kv';
import { clearSessionIdentity, getSessionId } from '@/lib/session';

const SESSION_COOKIE_NAME = 'bookpoll_session';

export async function POST() {
  try {
    const sessionId = await getSessionId();
    if (sessionId) {
      await clearSessionIdentity(sessionId);
    }

    const newSessionId = crypto.randomUUID();
    await saveSession({
      id: newSessionId,
      name: null,
      createdAt: Date.now(),
    });

    const response = NextResponse.json({ ok: true, sessionId: newSessionId });
    response.cookies.set(SESSION_COOKIE_NAME, newSessionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365 * 10,
    });

    return response;
  } catch (error) {
    console.error('Error signing out:', error);
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    );
  }
}
