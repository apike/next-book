import { cookies } from 'next/headers';
import { Session } from './types';
import { getSession, saveSession } from './kv';

const SESSION_COOKIE_NAME = 'bookpoll_session';

/**
 * Gets the session ID from cookies.
 * The cookie is set by middleware, so it should always exist on poll pages.
 * Must be called from a Server Component or Route Handler.
 */
export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Gets the current session from cookies and Redis.
 * Returns null if no session cookie exists.
 */
export async function getCurrentSession(): Promise<Session | null> {
  const sessionId = await getSessionId();

  if (!sessionId) {
    return null;
  }

  return await getSession(sessionId);
}

/**
 * Gets the session, creating the Redis record if it doesn't exist.
 * The cookie must already exist (set by middleware).
 * Returns the session object, or null if no cookie or on error.
 */
export async function getOrCreateSession(): Promise<Session | null> {
  const sessionId = await getSessionId();
  
  if (!sessionId) {
    return null;
  }

  try {
    let session = await getSession(sessionId);

    if (!session) {
      // Session cookie exists but Redis data doesn't - create it
      session = {
        id: sessionId,
        name: null,
        createdAt: Date.now(),
      };
      await saveSession(session);
    }

    return session;
  } catch (error) {
    // If Redis fails, return a temporary session object using just the cookie ID
    // This allows the app to function even if Redis is unavailable
    console.error('Error accessing session from Redis:', error);
    return {
      id: sessionId,
      name: null,
      createdAt: Date.now(),
    };
  }
}

/**
 * Updates the session name if not already set.
 */
export async function setSessionName(sessionId: string, name: string): Promise<void> {
  const session = await getSession(sessionId);
  if (session && !session.name) {
    session.name = name;
    await saveSession(session);
  }
}
