'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserMenu } from '@/components/UserMenu';
import type { Account, Club, Poll } from '@/lib/types';

interface AdminPageClientProps {
  account: Account;
  credentialCount: number;
  initialPolls: Poll[];
  initialClubs: Club[];
}

interface AttachClubResponse {
  poll?: Poll;
  club?: Club;
  error?: string;
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function completedVoteCount(poll: Poll): number {
  return poll.voters.filter((voter) => voter.completedAt && !voter.excluded).length;
}

export default function AdminPageClient({
  account,
  credentialCount: initialCredentialCount,
  initialPolls,
  initialClubs,
}: AdminPageClientProps) {
  const [credentialCount, setCredentialCount] = useState(initialCredentialCount);
  const [polls, setPolls] = useState(initialPolls);
  const [clubs, setClubs] = useState(initialClubs);
  const [selectedClubIds, setSelectedClubIds] = useState<Record<string, string>>({});
  const [statusByPollId, setStatusByPollId] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [attachingPollId, setAttachingPollId] = useState<string | null>(null);
  const router = useRouter();

  const clubById = useMemo(() => {
    return new Map(clubs.map((club) => [club.id, club]));
  }, [clubs]);

  const legacyPollCount = polls.filter((poll) => !poll.clubId).length;

  const handleAttachClub = async (poll: Poll) => {
    const clubId = selectedClubIds[poll.id] ?? clubs[0]?.id ?? '';
    if (!clubId) {
      setStatusByPollId((statuses) => ({
        ...statuses,
        [poll.id]: 'Choose a club first.',
      }));
      return;
    }

    setAttachingPollId(poll.id);
    setStatusByPollId((statuses) => ({ ...statuses, [poll.id]: '' }));
    setPageError('');

    try {
      const response = await fetch(`/api/admin/polls/${poll.id}/attach-club`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId }),
      });
      const data: AttachClubResponse = await response.json();

      if (!response.ok || !data.poll || !data.club) {
        throw new Error(data.error || 'Failed to attach poll');
      }

      const attachedPoll = data.poll;
      const attachedClub = data.club;

      setPolls((currentPolls) =>
        currentPolls.map((currentPoll) =>
          currentPoll.id === attachedPoll.id ? attachedPoll : currentPoll
        )
      );
      setClubs((currentClubs) => {
        const existingIndex = currentClubs.findIndex((club) => club.id === attachedClub.id);
        if (existingIndex === -1) {
          return [attachedClub, ...currentClubs];
        }

        return currentClubs.map((club) =>
          club.id === attachedClub.id ? attachedClub : club
        );
      });
      setStatusByPollId((statuses) => ({
        ...statuses,
        [poll.id]: `Attached to ${attachedClub.name}.`,
      }));
    } catch (err) {
      setStatusByPollId((statuses) => ({
        ...statuses,
        [poll.id]: err instanceof Error ? err.message : 'Failed to attach poll.',
      }));
    } finally {
      setAttachingPollId(null);
    }
  };

  return (
    <main className="pb-8">
      <header className="border-b border-card-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href="/" className="text-sm text-primary hover:underline">
              Next Book
            </Link>
            <h1 className="text-2xl font-bold font-serif mt-1 truncate">Admin</h1>
          </div>
          <UserMenu
            account={account}
            credentialCount={credentialCount}
            onCredentialCountChange={setCredentialCount}
            onSignOut={() => router.push('/')}
            onError={setPageError}
          />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {pageError && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p>{pageError}</p>
                <button
                  type="button"
                  onClick={() => setPageError('')}
                  className="mt-1 text-sm underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-card border border-card-border">
            <p className="text-sm text-muted">Polls</p>
            <p className="text-2xl font-semibold">{polls.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-card-border">
            <p className="text-sm text-muted">Legacy polls</p>
            <p className="text-2xl font-semibold">{legacyPollCount}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-card-border">
            <p className="text-sm text-muted">Clubs</p>
            <p className="text-2xl font-semibold">{clubs.length}</p>
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-4 mb-3">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
              Polls
            </h2>
          </div>

          {polls.length === 0 ? (
            <p className="text-muted">No polls yet.</p>
          ) : (
            <div className="space-y-3">
              {polls.map((poll) => {
                const club = poll.clubId ? clubById.get(poll.clubId) : null;
                const selectedClubId = selectedClubIds[poll.id] ?? clubs[0]?.id ?? '';
                const isAttaching = attachingPollId === poll.id;

                return (
                  <article
                    key={poll.id}
                    className="p-4 rounded-xl bg-card border border-card-border space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/poll/${poll.id}`}
                            className="font-semibold font-serif text-lg hover:text-primary truncate"
                          >
                            {poll.name}
                          </Link>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${poll.clubId ? 'bg-success/10 text-success' : 'bg-secondary/15 text-primary'}`}>
                            {poll.clubId ? 'Club' : 'Legacy'}
                          </span>
                        </div>
                        <p className="text-sm text-muted mt-1">
                          {formatDateTime(poll.createdAt)} - {completedVoteCount(poll)} vote{completedVoteCount(poll) !== 1 ? 's' : ''} - {poll.books.length} book{poll.books.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-muted mt-1 break-all">Poll ID: {poll.id}</p>
                      </div>

                      <Link
                        href={`/poll/${poll.id}`}
                        className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-card-border text-sm font-medium hover:border-primary/40"
                      >
                        Open Poll
                      </Link>
                    </div>

                    {poll.clubId ? (
                      <div className="pt-3 border-t border-card-border text-sm">
                        <span className="text-muted">Club: </span>
                        <Link
                          href={`/club/${poll.clubId}`}
                          className="text-primary hover:underline"
                        >
                          {club?.name ?? poll.clubId}
                        </Link>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-card-border">
                        {clubs.length > 0 ? (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <label className="sr-only" htmlFor={`club-${poll.id}`}>
                              Club
                            </label>
                            <select
                              id={`club-${poll.id}`}
                              value={selectedClubId}
                              onChange={(event) =>
                                setSelectedClubIds((selected) => ({
                                  ...selected,
                                  [poll.id]: event.target.value,
                                }))
                              }
                              disabled={isAttaching}
                              className="min-w-0 flex-1 px-3 py-2 rounded-lg bg-background border border-card-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                            >
                              {clubs.map((clubOption) => (
                                <option key={clubOption.id} value={clubOption.id}>
                                  {clubOption.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleAttachClub(poll)}
                              disabled={isAttaching}
                              className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isAttaching ? 'Attaching...' : 'Attach to Club'}
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted">Create a club before attaching legacy polls.</p>
                        )}
                        {statusByPollId[poll.id] && (
                          <p className="mt-2 text-sm text-muted">{statusByPollId[poll.id]}</p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
