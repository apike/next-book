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
    <main className="flex flex-col items-center px-4 pt-6 pb-6">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-4">
          <img
            src="/next-book.png"
            alt="Book Club Poll"
            className="w-16 h-16 mb-2 mx-auto"
          />
          <h1 className="text-2xl font-bold mb-1 font-serif">
            Next Book
          </h1>
          <p className="text-muted text-sm">
            Polling for book clubs, with ranked voting.
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
              placeholder="e.g., January Picks"
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
