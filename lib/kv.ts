import { Redis } from '@upstash/redis';
import { Poll, Session } from './types';

const POLL_PREFIX = 'poll:';
const SESSION_PREFIX = 'session:';

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getPoll(id: string): Promise<Poll | null> {
  return await redis.get<Poll>(`${POLL_PREFIX}${id}`);
}

export async function savePoll(poll: Poll): Promise<void> {
  await redis.set(`${POLL_PREFIX}${poll.id}`, poll);
}

export async function deletePoll(id: string): Promise<void> {
  await redis.del(`${POLL_PREFIX}${id}`);
}

export async function getSession(id: string): Promise<Session | null> {
  return await redis.get<Session>(`${SESSION_PREFIX}${id}`);
}

export async function saveSession(session: Session): Promise<void> {
  await redis.set(`${SESSION_PREFIX}${session.id}`, session);
}
