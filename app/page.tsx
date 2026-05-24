'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithPasskey, registerWithPasskey } from '@/lib/passkey-client';
import { UserMenu } from '@/components/UserMenu';
import type { Account, AuthMeResponse, Club } from '@/lib/types';

export default function Home() {
  const [displayName, setDisplayName] = useState('');
  const [clubName, setClubName] = useState('');
  const [account, setAccount] = useState<Account | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [credentialCount, setCredentialCount] = useState(0);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingClubs, setIsLoadingClubs] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const loadClubs = useCallback(async () => {
    setIsLoadingClubs(true);
    try {
      const response = await fetch('/api/clubs');
      const data: { clubs?: Club[]; error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load clubs');
      }

      setClubs(data.clubs ?? []);
    } finally {
      setIsLoadingClubs(false);
    }
  }, []);

  useEffect(() => {
    async function loadAuth() {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          throw new Error('Failed to load auth state');
        }

        const data: AuthMeResponse = await response.json();
        setAccount(data.account);
        setCredentialCount(data.credentialCount);
        if (data.account) {
          setDisplayName(data.account.displayName);
          await loadClubs();
        }
      } catch {
        setError('Failed to check sign-in status.');
      } finally {
        setIsLoadingAuth(false);
      }
    }

    loadAuth();
  }, [loadClubs]);

  const handleLogin = async () => {
    setIsWorking(true);
    setError('');
    try {
      const auth = await loginWithPasskey();
      setAccount(auth.account);
      setCredentialCount(auth.credentialCount);
      setDisplayName(auth.account?.displayName ?? '');
      await loadClubs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setIsWorking(true);
    setError('');
    try {
      const auth = await registerWithPasskey(displayName.trim());
      setAccount(auth.account);
      setCredentialCount(auth.credentialCount);
      setClubs([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) {
      setError('Sign in before creating a club.');
      return;
    }

    if (!clubName.trim()) {
      setError('Please enter a club name.');
      return;
    }

    setIsWorking(true);
    setError('');

    try {
      const response = await fetch('/api/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubName: clubName.trim() }),
      });

      const data: { club?: Club; error?: string } = await response.json();
      if (!response.ok || !data.club) {
        throw new Error(data.error || 'Failed to create club');
      }

      router.push(`/club/${data.club.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create club.');
      setIsWorking(false);
    }
  };

  return (
    <main className="flex flex-col items-center px-4 pt-6 pb-6">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {account && (
          <div className="mb-2 flex justify-end">
            <UserMenu
              account={account}
              credentialCount={credentialCount}
              onCredentialCountChange={setCredentialCount}
              onSignOut={() => {
                setAccount(null);
                setClubs([]);
                setCredentialCount(0);
                setDisplayName('');
              }}
              onError={setError}
            />
          </div>
        )}

        <div className="text-center mb-4">
          <Image
            src="/next-book.png"
            alt="Book Club Poll"
            width={64}
            height={64}
            className="w-16 h-16 mb-2 mx-auto"
            priority
          />
          <h1 className="text-2xl font-bold mb-1 font-serif">
            Next Book
          </h1>
          <p className="text-muted text-sm">
            Polling for book clubs, with ranked voting.
          </p>
        </div>

        <div className="space-y-4">
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

          {isLoadingAuth ? (
            <div className="bg-card rounded-2xl p-5 shadow-lg border border-card-border text-center text-muted">
              Checking sign-in status...
            </div>
          ) : account ? (
            <>
              {(isLoadingClubs || clubs.length > 0) && (
                <section>
                  <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
                    Your Clubs
                  </h2>
                  {isLoadingClubs ? (
                    <p className="text-muted">Loading clubs...</p>
                  ) : (
                    <div className="space-y-2">
                      {clubs.map((club) => (
                        <Link
                          key={club.id}
                          href={`/club/${club.id}`}
                          className="block p-4 rounded-xl bg-card border border-card-border hover:border-primary/40"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-semibold font-serif truncate">{club.name}</h3>
                              <p className="text-sm text-muted">
                                {club.pollIds.length} poll{club.pollIds.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <span className="text-primary text-sm flex-shrink-0">Open</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section>
                <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
                  New Club
                </h2>
                <div className="bg-card rounded-2xl p-5 shadow-lg border border-card-border space-y-4">
                  <form onSubmit={handleCreateClub} className="space-y-3">
                    <label
                      htmlFor="clubName"
                      className="block text-sm font-semibold"
                    >
                      Club name
                    </label>
                    <input
                      type="text"
                      id="clubName"
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      placeholder="e.g., Sunday Book Club"
                      autoComplete="off"
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted/60"
                      disabled={isWorking}
                    />
                    <button
                      type="submit"
                      disabled={!clubName.trim() || isWorking}
                      className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isWorking ? 'Creating...' : 'Create Club'}
                    </button>
                  </form>
                </div>
              </section>
            </>
          ) : (
            <section className="bg-card rounded-2xl p-5 shadow-lg border border-card-border space-y-5">
              <button
                type="button"
                onClick={handleLogin}
                disabled={isWorking}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isWorking ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="border-t border-card-border pt-5">
                <form onSubmit={handleRegister} className="space-y-3">
                  <label
                    htmlFor="displayName"
                    className="block text-sm font-semibold"
                  >
                    Create New Account
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted/60"
                    disabled={isWorking}
                  />
                  <button
                    type="submit"
                    disabled={!displayName.trim() || isWorking}
                    className="w-full py-3 rounded-xl border border-card-border bg-background text-foreground font-semibold hover:bg-card disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isWorking ? 'Creating...' : 'Create Account'}
                  </button>
                </form>
              </div>
            </section>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs text-muted">
            {['Add books', 'Share with your club', 'Drag to rank', 'Fair voting', 'Cheap and cheerful'].map((feature) => (
              <span key={feature} className="inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
