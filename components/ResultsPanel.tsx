'use client';

import { useState } from 'react';
import { Poll, RankedResult, Voter } from '@/lib/types';
import { calculateMinimaxResults } from '@/lib/minimax';

interface ResultsPanelProps {
  poll: Poll;
}

function VoterBadge({ voter, poll }: { voter: Voter; poll: Poll }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const rankings = voter.rankings.map((bookId, index) => {
    const book = poll.books.find(b => b.id === bookId);
    return { rank: index + 1, title: book?.title ?? 'Unknown book' };
  });

  return (
    <div className="relative">
      <span
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success text-sm cursor-help"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {voter.name}
      </span>
      
      {showTooltip && rankings.length > 0 && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
          <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
            <div className="font-semibold mb-1">{voter.name}&apos;s Rankings:</div>
            {rankings.map(({ rank, title }) => (
              <div key={rank} className="flex gap-2">
                <span className="text-muted-foreground">{rank}.</span>
                <span>{title}</span>
              </div>
            ))}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
        </div>
      )}
    </div>
  );
}

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return '';
  }
}

function getScoreExplanation(result: RankedResult): string {
  if (result.worstDefeat <= 0) {
    return 'Beats or ties all opponents';
  }
  return `Worst loss: ${result.worstDefeat} vote${result.worstDefeat !== 1 ? 's' : ''}`;
}

export function ResultsPanel({ poll }: ResultsPanelProps) {
  const completedVoters = poll.voters.filter(v => v.completedAt);
  const results = calculateMinimaxResults(poll.books, completedVoters);

  if (completedVoters.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        <p>No votes yet. Results will appear once someone completes voting.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vote count */}
      <div className="text-center">
        <p className="text-sm text-muted">
          Based on <span className="font-semibold text-foreground">{completedVoters.length}</span> completed vote{completedVoters.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Results list */}
      <div className="space-y-3">
        {results.map((result) => (
          <div
            key={result.book.id}
            className={`
              p-4 rounded-xl border
              ${result.rank === 1 
                ? 'bg-secondary/10 border-secondary/30' 
                : 'bg-card border-card-border'
              }
            `}
          >
            <div className="flex items-center gap-3">
              {/* Rank */}
              <div className={`
                flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold
                ${result.rank === 1 
                  ? 'bg-secondary text-foreground' 
                  : 'bg-card-border text-muted'
                }
              `}>
                {getRankEmoji(result.rank) || `#${result.rank}`}
              </div>

              {/* Book info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate font-serif">
                  {result.book.title}
                </h3>
                <p className="text-sm text-muted truncate">by {result.book.author}</p>
              </div>
            </div>

            {/* Score explanation */}
            <p className="mt-2 text-xs text-muted pl-13">
              {getScoreExplanation(result)}
            </p>
          </div>
        ))}
      </div>

      {/* Completed voters */}
      <div className="pt-4 border-t border-card-border">
        <h4 className="text-sm font-semibold mb-3">Completed Voting</h4>
        <div className="flex flex-wrap gap-2">
          {completedVoters.map((voter) => (
            <VoterBadge key={voter.name} voter={voter} poll={poll} />
          ))}
        </div>
      </div>
    </div>
  );
}
