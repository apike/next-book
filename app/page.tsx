'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [pollName, setPollName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pollName.trim()) {
      setError('Please enter a poll name');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pollName.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to create poll');
      }

      const poll = await response.json();
      router.push(`/poll/${poll.id}`);
    } catch {
      setError('Failed to create poll. Please try again.');
      setIsCreating(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center px-4 pt-6 pb-2">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-2">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-1 font-serif">
            Book Club Poll
          </h1>
          <p className="text-muted text-sm">
            Create a poll, invite your friends, and vote on your next read together.
          </p>
        </div>

        {/* Create Poll Form */}
        <form onSubmit={handleCreatePoll} className="space-y-4">
          <div className="bg-card rounded-2xl p-5 shadow-lg border border-card-border">
            <label
              htmlFor="pollName"
              className="block text-sm font-semibold mb-2"
            >
              Poll Name
            </label>
            <input
              type="text"
              id="pollName"
              value={pollName}
              onChange={(e) => setPollName(e.target.value)}
              placeholder="e.g., January 2026 Book Club"
              autoComplete="off"
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted/60"
              disabled={isCreating}
            />
            
            {error && (
              <p className="mt-3 text-sm text-danger">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="w-full py-3 px-6 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
          >
            {isCreating ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Poll'
            )}
          </button>
        </form>

        {/* Features */}
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
    </main>
  );
}
