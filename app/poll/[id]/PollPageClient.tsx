'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { loginWithPasskey, registerWithPasskey } from '@/lib/passkey-client';
import { CasualUserMenu, UserMenu } from '@/components/UserMenu';
import type { Account, AuthMeResponse, ClubMember, Poll, Voter } from '@/lib/types';
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { BookList } from '@/components/BookList';
import { ActivityLog } from '@/components/ActivityLog';
import { ResultsPanel } from '@/components/ResultsPanel';

interface PollPageClientProps {
  pollId: string;
  sessionId: string;
  initialName: string;
  hasVotedInPoll: boolean;
  initialRankings: string[];
  initialAccount: Account | null;
  initialCredentialCount: number;
  initialClubMember: ClubMember | null;
  initialClubName: string | null;
}

export default function PollPageClient({ 
  pollId, 
  sessionId: initialSessionId,
  initialName, 
  hasVotedInPoll,
  initialRankings,
  initialAccount,
  initialCredentialCount,
  initialClubMember,
  initialClubName,
}: PollPageClientProps) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // User state - initialize from server-provided session data
  const [userName, setUserName] = useState(initialName);
  const [currentSessionId, setCurrentSessionId] = useState(initialSessionId);
  const [hasEnteredName, setHasEnteredName] = useState(!!initialName);
  const [hasCompletedVoting, setHasCompletedVoting] = useState(hasVotedInPoll);
  const [account, setAccount] = useState<Account | null>(initialAccount);
  const [credentialCount, setCredentialCount] = useState(initialCredentialCount);
  const [clubMember, setClubMember] = useState<ClubMember | null>(initialClubMember);
  const [clubName, setClubName] = useState<string | null>(initialClubName);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>(initialClubMember ? [initialClubMember] : []);
  const [isAuthWorking, setIsAuthWorking] = useState(false);
  const [isJoiningClub, setIsJoiningClub] = useState(false);

  // Form state
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [isAddingBook, setIsAddingBook] = useState(false);

  // Rankings state - restore from server if already voted
  const [rankedBookIds, setRankedBookIds] = useState<string[]>(initialRankings);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<'vote' | 'add-books' | 'results' | 'activity'>('vote');
  const [bookToDelete, setBookToDelete] = useState<string | null>(null);
  const [hasPeekedAtResults, setHasPeekedAtResults] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  
  // Refs
  const bookTitleInputRef = useRef<HTMLInputElement>(null);
  const hasAttemptedJoinRef = useRef(false);

  const fetchPoll = useCallback(async () => {
    try {
      const response = await fetch(`/api/polls/${pollId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Poll not found');
        } else {
          throw new Error('Failed to fetch poll');
        }
        return;
      }
      const data = await response.json();
      setPoll(data);
    } catch {
      setError('Failed to load poll');
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  const fetchClubContext = useCallback(async (clubId: string) => {
    try {
      const response = await fetch(`/api/clubs/${clubId}`);
      if (!response.ok) {
        return;
      }

      const data: {
        club: { name: string };
        members: ClubMember[];
        currentMember: ClubMember | null;
      } = await response.json();

      setClubName(data.club.name);
      setClubMembers(data.members);
      if (data.currentMember) {
        setClubMember(data.currentMember);
        setUserName(data.currentMember.displayName);
        setHasEnteredName(true);
      }
    } catch {
      // Polls remain usable without club context.
    }
  }, []);

  const claimSessionVote = useCallback(async () => {
    try {
      const response = await fetch(`/api/polls/${pollId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return;
      }

      const data: {
        claimed: boolean;
        poll?: Poll;
        voter?: Voter;
        clubMember?: ClubMember | null;
      } = await response.json();

      if (data.poll) {
        setPoll(data.poll);
      }

      const claimedClubMember = data.clubMember;
      if (claimedClubMember) {
        setClubMember(claimedClubMember);
        setClubMembers((members) => {
          if (members.some((member) => member.id === claimedClubMember.id)) {
            return members;
          }
          return [...members, claimedClubMember];
        });
      }

      if (data.voter) {
        setUserName(data.voter.name);
        setHasEnteredName(true);
        setHasCompletedVoting(true);
        setRankedBookIds(data.voter.rankings);
      }
    } catch {
      // Existing anonymous votes remain usable if claiming fails.
    }
  }, [pollId]);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  useEffect(() => {
    if (poll?.clubId) {
      fetchClubContext(poll.clubId);
    }
  }, [fetchClubContext, poll?.clubId]);

  useEffect(() => {
    async function joinClub() {
      if (!poll?.clubId || !account || clubMember || isJoiningClub || hasAttemptedJoinRef.current) {
        return;
      }

      hasAttemptedJoinRef.current = true;
      setIsJoiningClub(true);
      try {
        const response = await fetch(`/api/clubs/${poll.clubId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data: { member: ClubMember } = await response.json();
          setClubMember(data.member);
          setClubMembers((members) => {
            if (members.some((member) => member.id === data.member.id)) {
              return members;
            }
            return [...members, data.member];
          });
          setUserName(data.member.displayName);
          setHasEnteredName(true);
        }
      } catch {
        // A signed-in user can still use the poll as a casual participant.
      } finally {
        setIsJoiningClub(false);
      }
    }

    joinClub();
  }, [account, clubMember, isJoiningClub, poll?.clubId]);

  useEffect(() => {
    if (!poll || !account) {
      return;
    }

    const existingVoter = poll.voters.find(voter => (
      voter.completedAt &&
      (voter.accountId === account.id || (!!clubMember && voter.clubMemberId === clubMember.id))
    ));

    if (existingVoter) {
      setUserName(existingVoter.name);
      setHasEnteredName(true);
      setHasCompletedVoting(true);
      setRankedBookIds(existingVoter.rankings);
    }
  }, [account, clubMember, poll]);

  // Default to Add Books tab if no books yet (only on initial load)
  const hasSetInitialTab = useRef(false);
  useEffect(() => {
    if (poll && !hasSetInitialTab.current) {
      hasSetInitialTab.current = true;
      if (poll.books.length === 0) {
        setActiveTab('add-books');
      }
    }
  }, [poll]);

  const handleEnterName = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      setHasEnteredName(true);
    }
  };

  const handleLogin = async () => {
    setIsAuthWorking(true);
    setError('');
    try {
      const auth: AuthMeResponse = await loginWithPasskey();
      hasAttemptedJoinRef.current = false;
      setAccount(auth.account);
      setCredentialCount(auth.credentialCount);
      if (auth.account && !clubMember) {
        setUserName(auth.account.displayName);
        setHasEnteredName(true);
      }
      await claimSessionVote();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in.');
    } finally {
      setIsAuthWorking(false);
    }
  };

  const handleCreatePasskey = async (): Promise<boolean> => {
    const displayName = userName.trim();
    if (!displayName) {
      setError('Enter your name before creating a passkey.');
      return false;
    }

    setIsAuthWorking(true);
    setError('');
    try {
      const auth: AuthMeResponse = await registerWithPasskey(displayName, pollId);
      hasAttemptedJoinRef.current = false;
      setAccount(auth.account);
      setCredentialCount(auth.credentialCount);
      if (auth.account) {
        setUserName(auth.account.displayName);
        setHasEnteredName(true);
      }
      await claimSessionVote();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create passkey.');
      return false;
    } finally {
      setIsAuthWorking(false);
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim() || !bookAuthor.trim() || !userName.trim()) return;

    setIsAddingBook(true);
    try {
      const response = await fetch(`/api/polls/${pollId}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bookTitle.trim(),
          author: bookAuthor.trim(),
          addedBy: userName.trim(),
          sessionId: currentSessionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add book');
      }

      const updatedPoll = await response.json();
      setPoll(updatedPoll);
      setBookTitle('');
      setBookAuthor('');
      setIsAddingBook(false);
      // Focus back on the title field for easy adding of multiple books
      // Use setTimeout to ensure the DOM has fully updated after React re-render
      setTimeout(() => {
        bookTitleInputRef.current?.focus();
      }, 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add book');
      setIsAddingBook(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!userName.trim()) return;

    try {
      const response = await fetch(
        `/api/polls/${pollId}/books/${bookId}?actor=${encodeURIComponent(userName.trim())}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete book');
      }

      const updatedPoll = await response.json();
      setPoll(updatedPoll);
      // Remove from local rankings if present
      setRankedBookIds(prev => prev.filter(id => id !== bookId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete book');
    }
  };

  const canDeleteBook = (bookId: string): boolean => {
    if (!poll || hasCompletedVoting) return false;
    // Can only delete if no one has voted for it
    return !poll.voters.some(voter => voter.rankings.includes(bookId));
  };

  const handleSubmitVote = async () => {
    if (!poll || !userName.trim()) return;
    if (rankedBookIds.length === 0) {
      setError('Please rank at least one book before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterName: userName.trim(),
          rankings: rankedBookIds,
          sessionId: currentSessionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit vote');
      }

      const updatedPoll = await response.json();
      setPoll(updatedPoll);
      setHasCompletedVoting(true);
      setActiveTab('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmitVote = poll && 
    rankedBookIds.length > 0 && 
    poll.books.length > 0 &&
    !hasCompletedVoting;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-muted">Loading poll...</p>
        </div>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Oops!</h1>
          <p className="text-muted">{error}</p>
          <Link href="/" className="inline-block mt-6 text-primary hover:underline">
            ← Create a new poll
          </Link>
        </div>
      </div>
    );
  }

  if (!poll) return null;

  const hasAnyCompletedVotes = poll.voters.some(voter => voter.completedAt);

  return (
    <main className="pb-6">
      {/* Header */}
      <header className="border-b border-card-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {poll.clubId && clubName && (
                <Link
                  href={`/club/${poll.clubId}`}
                  className="block text-sm text-primary hover:underline truncate"
                >
                  {clubName}
                </Link>
              )}
              <h1 className="text-xl font-bold font-serif">
                {poll.name}
              </h1>
            </div>
            {account ? (
              <UserMenu
                account={account}
                credentialCount={credentialCount}
                onCredentialCountChange={setCredentialCount}
                onSignOut={(newSessionId) => {
                  setAccount(null);
                  setCredentialCount(0);
                  setClubMember(null);
                  setUserName('');
                  setHasEnteredName(false);
                  setHasCompletedVoting(false);
                  setRankedBookIds([]);
                  setHasPeekedAtResults(false);
                  hasAttemptedJoinRef.current = false;
                  if (newSessionId) {
                    setCurrentSessionId(newSessionId);
                  }
                }}
                onError={setError}
                verifiedLabel={clubMember ? 'Verified member' : undefined}
              />
            ) : hasEnteredName && userName.trim() ? (
              <CasualUserMenu
                displayName={userName.trim()}
                isWorking={isAuthWorking}
                onCreatePasskey={handleCreatePasskey}
              />
            ) : null}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Error banner */}
        {error && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p>{error}</p>
                <button 
                  onClick={() => setError('')}
                  className="mt-1 text-sm underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Name entry */}
        {!hasEnteredName ? (
          <div className="bg-card rounded-2xl p-6 border border-card-border shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Enter your name to get started</h2>
            <form onSubmit={handleEnterName} className="flex gap-3">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                autoComplete="off"
                className="flex-1 px-4 py-3 rounded-xl bg-background border border-card-border focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={!userName.trim()}
                className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </form>
            {poll.clubId && !account && (
              <button
                type="button"
                onClick={handleLogin}
                disabled={isAuthWorking}
                className="mt-3 w-full py-2.5 rounded-xl border border-card-border bg-background text-foreground text-sm font-medium hover:bg-card disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAuthWorking ? 'Signing in...' : 'Sign in with passkey'}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <CopyLinkButton />
                {hasCompletedVoting && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Voted
                  </span>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                {poll.clubId && !account && (
                  <button
                    onClick={handleLogin}
                    disabled={isAuthWorking}
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    Sign in
                  </button>
                )}
                <button
                  onClick={fetchPoll}
                  className="text-sm text-muted hover:text-foreground flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-card-border/50 rounded-xl">
              <button
                onClick={() => setActiveTab('vote')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'vote'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Vote
              </button>
              <button
                onClick={() => setActiveTab('add-books')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'add-books'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Add Books
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'results'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Results
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'activity'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Activity
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'vote' && (
              <div className="space-y-6">
                {/* Book list for voting */}
                <BookList
                  books={poll.books}
                  rankedBookIds={rankedBookIds}
                  onRankingsChange={setRankedBookIds}
                  disabled={hasCompletedVoting}
                />

                {/* Submit vote button */}
                {!hasCompletedVoting && poll.books.length > 0 && (
                  <div className="pt-4">
                    {rankedBookIds.length === 0 && (
                      <p className="text-sm text-muted text-center mb-3">
                        Rank at least one book to submit your vote.
                      </p>
                    )}
                    <button
                      onClick={handleSubmitVote}
                      disabled={!canSubmitVote || isSubmitting}
                      className="w-full py-4 rounded-xl bg-success text-white font-semibold text-lg hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-success/25"
                    >
                      {isSubmitting ? 'Submitting...' : 'Lock my vote'}
                    </button>
                  </div>
                )}

                {hasCompletedVoting && (
                  <div className="text-center py-6 text-muted">
                    <svg className="w-12 h-12 mx-auto mb-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium text-foreground">Your vote has been recorded!</p>
                    <p className="text-sm mt-1">Check the Results tab to see the rankings.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'add-books' && (
              <div className="space-y-6">
                {poll.voters.length > 0 ? (
                  <div className="bg-card rounded-2xl p-6 border border-card-border text-center">
                    <svg className="w-12 h-12 mx-auto mb-4 text-muted opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p className="text-muted">
                      Folks have already voted ({poll.voters.map(v => v.name).join(', ')}) so adding books is closed.
                      You can <Link href={poll.clubId ? `/club/${poll.clubId}` : '/'} className="text-primary hover:underline">start a new poll</Link> though if need be!
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-card rounded-2xl p-4 border border-card-border">
                      <h3 className="text-sm font-semibold mb-3">Add a Book</h3>
                      <form onSubmit={handleAddBook} className="space-y-3">
                        <input
                          ref={bookTitleInputRef}
                          type="text"
                          value={bookTitle}
                          onChange={(e) => setBookTitle(e.target.value)}
                          placeholder="Book title"
                          autoComplete="off"
                          className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                          disabled={isAddingBook}
                        />
                        <input
                          type="text"
                          value={bookAuthor}
                          onChange={(e) => setBookAuthor(e.target.value)}
                          placeholder="Author"
                          autoComplete="off"
                          className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                          disabled={isAddingBook}
                        />
                        <button
                          type="submit"
                          disabled={!bookTitle.trim() || !bookAuthor.trim() || isAddingBook}
                          className="w-full py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isAddingBook ? 'Adding...' : 'Add Book'}
                        </button>
                      </form>
                    </div>

                    <p className="text-xs text-muted text-center">
                      Once all books are added, you can share the link with your club and voting can begin!
                    </p>

                    {/* Show list of books that have been added */}
                    {poll.books.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
                          Books Added ({poll.books.length})
                        </h3>
                        <div className="space-y-2">
                          {poll.books.map((book) => (
                            <div
                              key={book.id}
                              className="flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border"
                            >
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate font-serif">
                                  {book.title}
                                </h3>
                                <p className="text-sm text-muted truncate">by {book.author}</p>
                              </div>
                              {canDeleteBook(book.id) && (
                                <button
                                  onClick={() => setBookToDelete(book.id)}
                                  className="flex-shrink-0 p-2 rounded-lg text-muted hover:text-danger hover:bg-danger/10 active:scale-95"
                                  title="Remove book"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {poll.books.length === 0 && (
                      <div className="text-center py-8 text-muted">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p>No books yet. Add the first book above!</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'results' && (
              <div className="bg-card rounded-2xl p-4 border border-card-border">
                {!hasAnyCompletedVotes || hasCompletedVoting || hasPeekedAtResults ? (
                  <ResultsPanel 
                    poll={poll} 
                    pollId={pollId}
                    onPollUpdate={setPoll}
                    actorName={userName}
                    clubMembers={poll.clubId ? clubMembers : []}
                  />
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto mb-4 text-secondary opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <p className="text-foreground mb-1">But&hellip; isn&apos;t it better if everybody votes first before seeing the results so far?</p>
                    <button
                      onClick={async () => {
                        setIsPeeking(true);
                        try {
                          const response = await fetch(`/api/polls/${pollId}/peek`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ actorName: userName.trim() }),
                          });
                          if (response.ok) {
                            const updatedPoll = await response.json();
                            setPoll(updatedPoll);
                          }
                        } catch (err) {
                          console.error('Failed to log peek:', err);
                        } finally {
                          setIsPeeking(false);
                          setHasPeekedAtResults(true);
                        }
                      }}
                      disabled={isPeeking}
                      className="text-sm text-muted hover:text-foreground underline underline-offset-2 disabled:opacity-50"
                    >
                      {isPeeking ? 'Loading...' : "I'm allowed to look, I promise!"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="bg-card rounded-2xl p-4 border border-card-border">
                <h3 className="text-sm font-semibold mb-4">Activity Log</h3>
                <ActivityLog activities={poll.activityLog} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {bookToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setBookToDelete(null)}
          />
          <div className="relative bg-card rounded-2xl p-6 shadow-xl border border-card-border max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Remove book?</h3>
            <p className="text-sm text-muted mb-6">
              Are you sure you want to remove &ldquo;{poll?.books.find(b => b.id === bookToDelete)?.title}&rdquo; from the poll?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBookToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-card-border text-foreground font-medium text-sm hover:bg-card-border/80"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteBook(bookToDelete);
                  setBookToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-danger text-white font-medium text-sm hover:bg-danger/90"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
