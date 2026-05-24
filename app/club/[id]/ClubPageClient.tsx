'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loginWithPasskey } from '@/lib/passkey-client';
import { UserMenu } from '@/components/UserMenu';
import type { Account, AuthMeResponse, Club, ClubMember, Poll } from '@/lib/types';

interface ClubPageClientProps {
  clubId: string;
}

interface ClubResponse {
  club: Club;
  members: ClubMember[];
  polls: Poll[];
  currentMember: ClubMember | null;
  isVerifiedMember: boolean;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ClubPageClient({ clubId }: ClubPageClientProps) {
  const [clubData, setClubData] = useState<ClubResponse | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [credentialCount, setCredentialCount] = useState(0);
  const [pollName, setPollName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState('');
  const hasAttemptedJoinRef = useRef(false);
  const router = useRouter();

  const fetchClub = useCallback(async () => {
    const response = await fetch(`/api/clubs/${clubId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load club');
    }

    setClubData(data);
  }, [clubId]);

  useEffect(() => {
    async function loadPage() {
      try {
        const [authResponse] = await Promise.all([
          fetch('/api/auth/me'),
          fetchClub(),
        ]);

        if (authResponse.ok) {
          const auth: AuthMeResponse = await authResponse.json();
          setAccount(auth.account);
          setCredentialCount(auth.credentialCount);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load club.');
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [fetchClub]);

  useEffect(() => {
    async function joinClub() {
      if (!account || !clubData || clubData.currentMember || hasAttemptedJoinRef.current) {
        return;
      }

      hasAttemptedJoinRef.current = true;
      try {
        const response = await fetch(`/api/clubs/${clubId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          await fetchClub();
        }
      } catch {
        // The page can still show public club history if joining fails.
      }
    }

    joinClub();
  }, [account, clubData, clubId, fetchClub]);

  const handleLogin = async () => {
    setIsWorking(true);
    setError('');
    try {
      const auth = await loginWithPasskey();
      hasAttemptedJoinRef.current = false;
      setAccount(auth.account);
      setCredentialCount(auth.credentialCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollName.trim()) {
      setError('Please enter a poll name.');
      return;
    }

    setIsWorking(true);
    setError('');

    try {
      const response = await fetch(`/api/clubs/${clubId}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pollName.trim() }),
      });
      const data: { poll?: Poll; error?: string } = await response.json();

      if (!response.ok || !data.poll) {
        throw new Error(data.error || 'Failed to create poll');
      }

      router.push(`/poll/${data.poll.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create poll.');
      setIsWorking(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center px-4">
        <p className="text-muted">Loading club...</p>
      </main>
    );
  }

  if (!clubData) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Club not found</h1>
          <p className="text-muted">{error || 'This club could not be found.'}</p>
          <Link href="/" className="inline-block mt-6 text-primary hover:underline">
            Create a new club
          </Link>
        </div>
      </main>
    );
  }

  const sortedPolls = [...clubData.polls].sort((a, b) => b.createdAt - a.createdAt);
  const pollLabel = sortedPolls.length === 0 ? 'First Poll' : 'Next Poll';

  return (
    <main className="pb-6">
      <header className="border-b border-card-border">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href="/" className="text-sm text-primary hover:underline">
              Next Book
            </Link>
            <h1 className="text-2xl font-bold font-serif mt-1 truncate">{clubData.club.name}</h1>
          </div>
          {account && (
            <UserMenu
              account={account}
              credentialCount={credentialCount}
              onCredentialCountChange={setCredentialCount}
              onSignOut={() => {
                setAccount(null);
                setCredentialCount(0);
                setClubData((data) => data ? {
                  ...data,
                  currentMember: null,
                  isVerifiedMember: false,
                } : data);
              }}
              onError={setError}
              verifiedLabel={clubData.currentMember ? 'Verified member' : undefined}
            />
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
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

        <section className="bg-card rounded-2xl p-5 border border-card-border shadow-lg space-y-4">
          {!account && (
            <button
              onClick={handleLogin}
              disabled={isWorking}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isWorking ? 'Signing in...' : 'Sign in with passkey'}
            </button>
          )}

          <form onSubmit={handleCreatePoll} className="space-y-3">
            <label
              htmlFor="pollName"
              className="block text-sm font-semibold"
            >
              {pollLabel}
            </label>
            <input
              type="text"
              id="pollName"
              value={pollName}
              onChange={(e) => setPollName(e.target.value)}
              placeholder={sortedPolls.length === 0 ? 'e.g., January Picks' : 'e.g., February Picks'}
              autoComplete="off"
              disabled={!clubData.currentMember || isWorking}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted/60 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!clubData.currentMember || !pollName.trim() || isWorking}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isWorking ? 'Creating...' : `Create ${pollLabel}`}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
            Polls
          </h2>
          {sortedPolls.length > 0 ? (
            <div className="space-y-2">
              {sortedPolls.map((poll) => (
                <Link
                  key={poll.id}
                  href={`/poll/${poll.id}`}
                  className="block p-4 rounded-xl bg-card border border-card-border hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold font-serif truncate">{poll.name}</h3>
                      <p className="text-sm text-muted">{formatDate(poll.createdAt)}</p>
                    </div>
                    <div className="text-sm text-muted flex-shrink-0">
                      {poll.voters.filter(voter => voter.completedAt).length} vote{poll.voters.filter(voter => voter.completedAt).length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted">No polls yet.</p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
            Verified Members
          </h2>
          <div className="flex flex-wrap gap-2">
            {clubData.members.map((member) => (
              <span
                key={member.id}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success text-sm"
              >
                {member.displayName}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
