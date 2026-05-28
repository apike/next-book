'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { addPasskey } from '@/lib/passkey-client';
import type { Account } from '@/lib/types';

interface UserMenuProps {
  account: Account;
  credentialCount: number;
  onCredentialCountChange: (credentialCount: number) => void;
  onSignOut: (sessionId?: string) => void;
  onError: (message: string) => void;
  verifiedLabel?: string;
}

interface CasualUserMenuProps {
  displayName: string;
  isWorking: boolean;
  onCreatePasskey: () => Promise<boolean>;
}

export function UserMenu({
  account,
  credentialCount,
  onCredentialCountChange,
  onSignOut,
  onError,
  verifiedLabel,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleAddPasskey = async () => {
    setIsWorking(true);
    try {
      const auth = await addPasskey();
      onCredentialCountChange(auth.credentialCount);
      setIsOpen(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to add passkey.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleSignOut = async () => {
    setIsWorking(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to sign out.');
      }

      const data: { sessionId?: string } = await response.json();
      setIsOpen(false);
      onSignOut(data.sessionId);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to sign out.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div ref={menuRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex h-10 max-w-[11rem] items-center gap-2 rounded-full border border-card-border bg-card px-3 text-sm font-medium text-foreground shadow-sm hover:border-primary/30 hover:bg-background"
        aria-label={`${account.displayName} account menu`}
        aria-expanded={isOpen}
        title={account.displayName}
      >
        <span className="min-w-0 truncate">{account.displayName}</span>
        <svg className="h-4 w-4 flex-shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-xl bg-card border border-card-border shadow-xl p-2 text-sm">
          <div className="px-3 py-2 border-b border-card-border">
            <p className="font-semibold truncate">{account.displayName}</p>
            <p className="text-xs text-muted">
              {credentialCount} passkey{credentialCount !== 1 ? 's' : ''}
            </p>
            {verifiedLabel && (
              <p className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {verifiedLabel}
              </p>
            )}
          </div>

          {account.admin && (
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className="mt-2 block w-full px-3 py-2 rounded-lg text-left hover:bg-background"
            >
              Admin
            </Link>
          )}
          <button
            type="button"
            onClick={handleAddPasskey}
            disabled={isWorking}
            className={`${account.admin ? '' : 'mt-2 '}w-full px-3 py-2 rounded-lg text-left hover:bg-background disabled:opacity-50`}
          >
            Add another passkey
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isWorking}
            className="w-full px-3 py-2 rounded-lg text-left text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function CasualUserMenu({ displayName, isWorking, onCreatePasskey }: CasualUserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCreatePasskey = async () => {
    const created = await onCreatePasskey();
    if (created) {
      setIsOpen(false);
    }
  };

  return (
    <div ref={menuRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex h-10 max-w-[11rem] items-center gap-2 rounded-full border border-card-border bg-card px-3 text-sm font-medium text-foreground shadow-sm hover:border-primary/30 hover:bg-background"
        aria-label={`${displayName} menu`}
        aria-expanded={isOpen}
        title={displayName}
      >
        <span className="min-w-0 truncate">{displayName}</span>
        <svg className="h-4 w-4 flex-shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-xl bg-card border border-card-border shadow-xl p-2 text-sm">
          <div className="px-3 py-2 border-b border-card-border">
            <p className="font-semibold truncate">{displayName}</p>
            <p className="text-xs text-muted">Name only</p>
          </div>

          <button
            type="button"
            onClick={handleCreatePasskey}
            disabled={isWorking}
            className="mt-2 w-full px-3 py-2 rounded-lg text-left hover:bg-background disabled:opacity-50"
          >
            {isWorking ? 'Creating...' : 'Create passkey'}
          </button>
        </div>
      )}
    </div>
  );
}
