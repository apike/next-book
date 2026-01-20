import { Poll } from './types';

const POLL_PREFIX = 'poll:';

// In-memory storage for local development
const memoryStore = new Map<string, Poll>();

// Check if we're in a Vercel environment with KV configured
const isVercelKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

// Dynamically import Vercel KV only when needed
async function getKV() {
  if (isVercelKV) {
    const { kv } = await import('@vercel/kv');
    return kv;
  }
  return null;
}

export async function getPoll(id: string): Promise<Poll | null> {
  const kv = await getKV();
  
  if (kv) {
    return await kv.get<Poll>(`${POLL_PREFIX}${id}`);
  }
  
  // Local development fallback
  return memoryStore.get(`${POLL_PREFIX}${id}`) || null;
}

export async function savePoll(poll: Poll): Promise<void> {
  const kv = await getKV();
  
  if (kv) {
    await kv.set(`${POLL_PREFIX}${poll.id}`, poll);
    return;
  }
  
  // Local development fallback
  memoryStore.set(`${POLL_PREFIX}${poll.id}`, poll);
}

export async function deletePoll(id: string): Promise<void> {
  const kv = await getKV();
  
  if (kv) {
    await kv.del(`${POLL_PREFIX}${id}`);
    return;
  }
  
  // Local development fallback
  memoryStore.delete(`${POLL_PREFIX}${id}`);
}
