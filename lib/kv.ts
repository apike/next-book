import { Redis } from '@upstash/redis';
import type {
  Account,
  AuthChallenge,
  Club,
  ClubMember,
  PasskeyCredential,
  Poll,
  Session,
} from './types';

const POLL_PREFIX = 'poll:';
const SESSION_PREFIX = 'session:';
const ACCOUNT_PREFIX = 'account:';
const CREDENTIAL_PREFIX = 'credential:';
const ACCOUNT_CREDENTIALS_PREFIX = 'account_credentials:';
const ACCOUNT_CLUBS_PREFIX = 'account_clubs:';
const CLUB_PREFIX = 'club:';
const CLUB_MEMBERS_PREFIX = 'club_members:';
const CLUB_MEMBER_PREFIX = 'club_member:';
const AUTH_CHALLENGE_PREFIX = 'auth_challenge:';
const AUTH_CHALLENGE_TTL_SECONDS = 5 * 60;

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function getStringSetMembers(key: string): Promise<string[]> {
  const keyType = await redis.type(key);
  if (keyType === 'none') {
    return [];
  }

  if (keyType === 'set') {
    return await redis.smembers<string[]>(key);
  }

  const existingMembers = (await redis.get<string[]>(key)) ?? [];
  if (!Array.isArray(existingMembers)) {
    await redis.del(key);
    return [];
  }

  await redis.del(key);
  const [firstMember, ...restMembers] = existingMembers;
  if (firstMember !== undefined) {
    await redis.sadd(key, firstMember, ...restMembers);
  }

  return existingMembers;
}

async function addStringSetMember(key: string, member: string): Promise<void> {
  const keyType = await redis.type(key);
  if (keyType !== 'none' && keyType !== 'set') {
    await getStringSetMembers(key);
  }

  await redis.sadd(key, member);
}

export async function getPoll(id: string): Promise<Poll | null> {
  return await redis.get<Poll>(`${POLL_PREFIX}${id}`);
}

export async function getAllPolls(): Promise<Poll[]> {
  const pollKeys: string[] = [];
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: `${POLL_PREFIX}*`,
      count: 100,
      type: 'string',
    });
    cursor = nextCursor;
    pollKeys.push(...keys);
  } while (cursor !== '0');

  if (pollKeys.length === 0) {
    return [];
  }

  const polls = await redis.mget<(Poll | null)[]>(...pollKeys);
  return polls
    .filter((poll): poll is Poll => poll !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
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

export async function getAccount(id: string): Promise<Account | null> {
  return await redis.get<Account>(`${ACCOUNT_PREFIX}${id}`);
}

export async function saveAccount(account: Account): Promise<void> {
  await redis.set(`${ACCOUNT_PREFIX}${account.id}`, account);
}

export async function getPasskeyCredential(id: string): Promise<PasskeyCredential | null> {
  return await redis.get<PasskeyCredential>(`${CREDENTIAL_PREFIX}${id}`);
}

export async function savePasskeyCredential(credential: PasskeyCredential): Promise<void> {
  await redis.set(`${CREDENTIAL_PREFIX}${credential.id}`, credential);
}

export async function getAccountCredentialIds(accountId: string): Promise<string[]> {
  return await getStringSetMembers(`${ACCOUNT_CREDENTIALS_PREFIX}${accountId}`);
}

export async function getAccountCredentials(accountId: string): Promise<PasskeyCredential[]> {
  const ids = await getAccountCredentialIds(accountId);
  const credentials = await Promise.all(ids.map((id) => getPasskeyCredential(id)));
  return credentials.filter((credential): credential is PasskeyCredential => credential !== null);
}

export async function addAccountCredentialId(accountId: string, credentialId: string): Promise<void> {
  await addStringSetMember(`${ACCOUNT_CREDENTIALS_PREFIX}${accountId}`, credentialId);
}

export async function getAccountClubIds(accountId: string): Promise<string[]> {
  return await getStringSetMembers(`${ACCOUNT_CLUBS_PREFIX}${accountId}`);
}

export async function getAccountClubs(accountId: string): Promise<Club[]> {
  const clubIds = await getAccountClubIds(accountId);
  const clubs = await Promise.all(clubIds.map((clubId) => getClub(clubId)));
  return clubs.filter((club): club is Club => club !== null);
}

export async function addAccountClubId(accountId: string, clubId: string): Promise<void> {
  await addStringSetMember(`${ACCOUNT_CLUBS_PREFIX}${accountId}`, clubId);
}

export async function getClub(id: string): Promise<Club | null> {
  return await redis.get<Club>(`${CLUB_PREFIX}${id}`);
}

export async function getAllClubs(): Promise<Club[]> {
  const clubKeys: string[] = [];
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: `${CLUB_PREFIX}*`,
      count: 100,
      type: 'string',
    });
    cursor = nextCursor;
    clubKeys.push(...keys);
  } while (cursor !== '0');

  if (clubKeys.length === 0) {
    return [];
  }

  const clubs = await redis.mget<(Club | null)[]>(...clubKeys);
  return clubs
    .filter((club): club is Club => club !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveClub(club: Club): Promise<void> {
  await redis.set(`${CLUB_PREFIX}${club.id}`, club);
}

export async function getClubMember(clubId: string, accountId: string): Promise<ClubMember | null> {
  return await redis.get<ClubMember>(`${CLUB_MEMBER_PREFIX}${clubId}:${accountId}`);
}

export async function getClubMemberAccountIds(clubId: string): Promise<string[]> {
  return await getStringSetMembers(`${CLUB_MEMBERS_PREFIX}${clubId}`);
}

export async function getClubMembers(clubId: string): Promise<ClubMember[]> {
  const accountIds = await getClubMemberAccountIds(clubId);
  const members = await Promise.all(accountIds.map((accountId) => getClubMember(clubId, accountId)));
  return members.filter((member): member is ClubMember => member !== null);
}

export async function saveClubMember(member: ClubMember): Promise<void> {
  await redis.set(`${CLUB_MEMBER_PREFIX}${member.clubId}:${member.accountId}`, member);
  await addAccountClubId(member.accountId, member.clubId);
  await addStringSetMember(`${CLUB_MEMBERS_PREFIX}${member.clubId}`, member.accountId);
}

export async function saveAuthChallenge(challenge: AuthChallenge): Promise<void> {
  await redis.set(`${AUTH_CHALLENGE_PREFIX}${challenge.sessionId}`, challenge, {
    ex: AUTH_CHALLENGE_TTL_SECONDS,
  });
}

export async function getAuthChallenge(sessionId: string): Promise<AuthChallenge | null> {
  const challenge = await redis.get<AuthChallenge>(`${AUTH_CHALLENGE_PREFIX}${sessionId}`);
  if (!challenge || challenge.expiresAt < Date.now()) {
    return null;
  }

  return challenge;
}

export async function deleteAuthChallenge(sessionId: string): Promise<void> {
  await redis.del(`${AUTH_CHALLENGE_PREFIX}${sessionId}`);
}
