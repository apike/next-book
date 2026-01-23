'use client';

import { useState } from 'react';
import { Poll, RankedResult, Voter } from '@/lib/types';
import { calculateMinimaxResults } from '@/lib/minimax';

interface ResultsPanelProps {
  poll: Poll;
  pollId: string;
  onPollUpdate: (poll: Poll) => void;
  actorName: string;
}

interface VoterBadgeProps {
  voter: Voter;
  poll: Poll;
  isSelected: boolean;
  onClick: () => void;
}

function VoterBadge({ voter, poll, isSelected, onClick }: VoterBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isExcluded = voter.excluded ?? false;
  
  const rankings = voter.rankings.map((bookId, index) => {
    const book = poll.books.find(b => b.id === bookId);
    return { rank: index + 1, title: book?.title ?? 'Unknown book' };
  });
  
  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors
          ${isExcluded 
            ? 'bg-muted/20 text-muted line-through' 
            : 'bg-success/10 text-success'
          }
          ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
          hover:opacity-80
        `}
      >
        {isExcluded ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {voter.name}
      </button>
      
      {/* Hover tooltip */}
      {showTooltip && !isSelected && rankings.length > 0 && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
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

interface VoterDetailsPanelProps {
  voter: Voter;
  poll: Poll;
  pollId: string;
  onToggleExclude: () => Promise<void>;
  isLoading: boolean;
}

function VoterDetailsPanel({ voter, poll, onToggleExclude, isLoading }: VoterDetailsPanelProps) {
  const rankings = voter.rankings.map((bookId, index) => {
    const book = poll.books.find(b => b.id === bookId);
    return { rank: index + 1, title: book?.title ?? 'Unknown book' };
  });
  
  const isExcluded = voter.excluded ?? false;

  return (
    <div className="mt-3 p-4 bg-background rounded-xl border border-card-border">
      <div className="font-semibold mb-2">{voter.name}&apos;s Rankings:</div>
      <div className="space-y-1 mb-4">
        {rankings.map(({ rank, title }) => (
          <div key={rank} className="flex gap-2 text-sm">
            <span className="text-muted w-5">{rank}.</span>
            <span>{title}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onToggleExclude}
        disabled={isLoading}
        className={`
          w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors
          ${isExcluded 
            ? 'bg-success/10 text-success hover:bg-success/20' 
            : 'bg-danger/10 text-danger hover:bg-danger/20'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isLoading 
          ? 'Updating...' 
          : isExcluded 
            ? 'Include in results' 
            : 'Exclude from results'
        }
      </button>
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

/**
 * Gets a unique identifier for a voter. For new voters this is their sessionId,
 * but for legacy voters (created before sessionId was required), we generate
 * a fallback identifier from their name and completedAt timestamp.
 */
function getVoterKey(voter: Voter): string {
  return voter.sessionId || `legacy-${voter.name}-${voter.completedAt}`;
}

export function ResultsPanel({ poll, pollId, onPollUpdate, actorName }: ResultsPanelProps) {
  const [selectedVoterKey, setSelectedVoterKey] = useState<string | null>(null);
  const [isExcluding, setIsExcluding] = useState(false);
  
  const completedVoters = poll.voters.filter(v => v.completedAt);
  const activeVoters = completedVoters.filter(v => !v.excluded);
  const results = calculateMinimaxResults(poll.books, completedVoters);
  
  const selectedVoter = selectedVoterKey 
    ? completedVoters.find(v => getVoterKey(v) === selectedVoterKey) 
    : null;

  const handleToggleExclude = async () => {
    if (!selectedVoter || !selectedVoterKey) return;
    
    setIsExcluding(true);
    try {
      const response = await fetch(`/api/polls/${pollId}/exclude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterKey: selectedVoterKey,
          actorName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle exclusion');
      }

      const updatedPoll = await response.json();
      onPollUpdate(updatedPoll);
    } catch (error) {
      console.error('Error toggling exclusion:', error);
    } finally {
      setIsExcluding(false);
    }
  };

  if (completedVoters.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        <p>No votes yet. Results will appear once someone completes voting.</p>
      </div>
    );
  }

  // Check if all votes are excluded
  const allExcluded = activeVoters.length === 0 && completedVoters.length > 0;

  return (
    <div className="space-y-6">
      {/* Vote count */}
      <div className="text-center">
        <p className="text-sm text-muted">
          Based on <span className="font-semibold text-foreground">{activeVoters.length}</span> of {completedVoters.length} vote{completedVoters.length !== 1 ? 's' : ''}
          {activeVoters.length !== completedVoters.length && (
            <span className="text-muted"> ({completedVoters.length - activeVoters.length} excluded)</span>
          )}
        </p>
      </div>

      {/* Results list */}
      {allExcluded ? (
        <div className="text-center py-8 text-muted">
          <p>At least one vote needs to be included to show results? 🙃</p>
        </div>
      ) : (
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
      )}

      {/* Completed voters */}
      <div className="pt-4 border-t border-card-border">
        <h4 className="text-sm font-semibold mb-3">Completed Voting</h4>
        <p className="text-xs text-muted mb-3">Tap a name to see their votes or exclude them from results.</p>
        <div className="flex flex-wrap gap-2">
          {completedVoters.map((voter) => {
            const voterKey = getVoterKey(voter);
            return (
              <VoterBadge 
                key={voterKey} 
                voter={voter} 
                poll={poll}
                isSelected={selectedVoterKey === voterKey}
                onClick={() => setSelectedVoterKey(
                  selectedVoterKey === voterKey ? null : voterKey
                )}
              />
            );
          })}
        </div>
        
        {/* Selected voter details */}
        {selectedVoter && (
          <VoterDetailsPanel
            voter={selectedVoter}
            poll={poll}
            pollId={pollId}
            onToggleExclude={handleToggleExclude}
            isLoading={isExcluding}
          />
        )}
      </div>
    </div>
  );
}
