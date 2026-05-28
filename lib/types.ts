import type { AuthenticatorTransportFuture, CredentialDeviceType } from '@simplewebauthn/server';

export interface Book {
  id: string;
  title: string;
  author: string;
  addedBy: string;
  addedAt: number;
}

export interface Voter {
  name: string;
  sessionId: string; // links vote to browser session
  accountId?: string; // links verified vote across devices
  clubMemberId?: string; // links verified vote to club roster
  verified?: boolean;
  rankings: string[]; // ordered book IDs (1st preference first)
  completedAt?: number; // timestamp when locked in
  excluded?: boolean; // if true, this vote is excluded from results
}

export interface Session {
  id: string;
  name: string | null; // user's display name, null until first action
  accountId?: string;
  createdAt: number;
}

export interface Account {
  id: string;
  displayName: string;
  admin?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PasskeyCredential {
  id: string;
  accountId: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  credentialDeviceType?: CredentialDeviceType;
  credentialBackedUp?: boolean;
  createdAt: number;
  lastUsedAt?: number;
}

export type AuthChallengeType = 'register' | 'login' | 'add-passkey';

export interface AuthChallenge {
  sessionId: string;
  type: AuthChallengeType;
  challenge: string;
  accountId?: string;
  displayName?: string;
  claimPollId?: string;
  rpID: string;
  origin: string;
  createdAt: number;
  expiresAt: number;
}

export interface Club {
  id: string;
  name: string;
  createdAt: number;
  createdByAccountId: string;
  pollIds: string[];
}

export interface ClubMember {
  id: string;
  clubId: string;
  accountId: string;
  displayName: string;
  joinedAt: number;
  verifiedAt: number;
}

export interface Activity {
  timestamp: number;
  type: 'book_added' | 'book_deleted' | 'voting_complete' | 'voter_excluded' | 'voter_included' | 'results_peeked';
  actor: string;
  detail?: string; // e.g., book title or voter name
}

export interface Poll {
  id: string;
  name: string;
  clubId?: string;
  createdByAccountId?: string;
  createdAt: number;
  books: Book[];
  voters: Voter[];
  activityLog: Activity[];
}

export interface CreatePollRequest {
  name: string;
}

export interface CreateClubRequest {
  clubName: string;
}

export interface CreateClubPollRequest {
  name: string;
}

export interface AddBookRequest {
  title: string;
  author: string;
  addedBy: string;
  sessionId: string;
}

export interface SubmitVoteRequest {
  voterName: string;
  rankings: string[];
  sessionId: string;
}

export interface ToggleExcludeRequest {
  voterKey: string; // sessionId for new voters, or "legacy-{name}-{timestamp}" for old voters
  actorName: string; // name of the person performing the action
}

export interface RankedResult {
  book: Book;
  worstDefeat: number; // The margin of their worst pairwise loss
  rank: number;
}

export interface AuthMeResponse {
  account: Account | null;
  credentialCount: number;
}
