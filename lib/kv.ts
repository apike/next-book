import { Redis } from '@upstash/redis';
import { Poll } from './types';

const POLL_PREFIX = 'poll:';

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
