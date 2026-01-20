'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Poll } from '@/lib/types';
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { BookList } from '@/components/BookList';
import { ActivityLog } from '@/components/ActivityLog';
import { ResultsPanel } from '@/components/ResultsPanel';

interface PollPageClientProps {
  pollId: string;
}

export default function PollPageClient({ pollId }: PollPageClientProps) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // User state
  const [userName, setUserName] = useState('');
  const [hasEnteredName, setHasEnteredName] = useState(false);
  const [hasCompletedVoting, setHasCompletedVoting] = useState(false);

  // Form state
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [isAddingBook, setIsAddingBook] = useState(false);

  // Rankings state (local to this user's session)
  const [rankedBookIds, setRankedBookIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<'vote' | 'add-books' | 'results' | 'activity'>('vote');
  
  // Refs
  const bookTitleInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

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
      <div className="flex-1 flex items-center justify-center">
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
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Oops!</h1>
          <p className="text-muted">{error}</p>
          <a href="/" className="inline-block mt-6 text-primary hover:underline">
            ← Create a new poll
          </a>
        </div>
      </div>
    );
  }

  if (!poll) return null;

  return (
    <main className="pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-card-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold truncate font-serif">
              {poll.name}
            </h1>
            <CopyLinkButton />
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
            <h2 className="text-lg font-semibold mb-4">Enter your name to vote</h2>
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
          </div>
        ) : (
          <>
            {/* User badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="font-medium">{userName}</span>
                {hasCompletedVoting && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Voted
                  </span>
                )}
              </div>
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
                disabled={!hasCompletedVoting}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'results'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground'
                } ${!hasCompletedVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                      You can <a href="/" className="text-primary hover:underline">start a new poll</a> though if need be!
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
                                  onClick={() => handleDeleteBook(book.id)}
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

            {activeTab === 'results' && hasCompletedVoting && (
              <div className="bg-card rounded-2xl p-4 border border-card-border">
                <ResultsPanel poll={poll} />
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
    </main>
  );
}
