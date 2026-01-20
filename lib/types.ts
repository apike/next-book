export interface Book {
  id: string;
  title: string;
  author: string;
  addedBy: string;
  addedAt: number;
}

export interface Voter {
  name: string;
  rankings: string[]; // ordered book IDs (1st preference first)
  completedAt?: number; // timestamp when locked in
}

export interface Activity {
  timestamp: number;
  type: 'book_added' | 'book_deleted' | 'voting_complete';
  actor: string;
  detail?: string; // e.g., book title
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
}

export interface SubmitVoteRequest {
  voterName: string;
  rankings: string[];
}

export interface RankedResult {
  book: Book;
  worstDefeat: number; // The margin of their worst pairwise loss
  rank: number;
}
