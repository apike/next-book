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
  rankings: string[]; // ordered book IDs (1st preference first)
  completedAt?: number; // timestamp when locked in
  excluded?: boolean; // if true, this vote is excluded from results
}

export interface Session {
  id: string;
  name: string | null; // user's display name, null until first action
  createdAt: number;
}

export interface Activity {
  timestamp: number;
  type: 'book_added' | 'book_deleted' | 'voting_complete' | 'voter_excluded' | 'voter_included';
  actor: string;
  detail?: string; // e.g., book title or voter name
}

export interface Poll {
  id: string;
  name: string;
  createdAt: number;
  books: Book[];
  voters: Voter[];
  activityLog: Activity[];
}

export interface CreatePollRequest {
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
  voterSessionId: string; // sessionId of the voter to exclude/include
  actorName: string; // name of the person performing the action
}

export interface RankedResult {
  book: Book;
  worstDefeat: number; // The margin of their worst pairwise loss
  rank: number;
}
