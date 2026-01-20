'use client';

import { Book } from '@/lib/types';

interface BookCardProps {
  book: Book;
  rank?: number;
  canDelete: boolean;
  onDelete?: () => void;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function BookCard({
  book,
  rank,
  canDelete,
  onDelete,
  isDragging,
  dragHandleProps,
}: BookCardProps) {
  const isDraggable = !!dragHandleProps;
  
  return (
    <div
      {...(dragHandleProps || {})}
      className={`
        flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border
        ${isDragging ? 'shadow-lg ring-2 ring-primary/20 opacity-90' : 'hover:border-primary/30'}
        ${isDraggable ? 'cursor-grab active:cursor-grabbing touch-none select-none' : ''}
      `}
    >
      {/* Rank badge */}
      {rank !== undefined && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
          {rank}
        </div>
      )}

      {/* Book info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate font-serif">
          {book.title}
        </h3>
        <p className="text-sm text-muted truncate">by {book.author}</p>
      </div>

      {/* Delete button */}
      {canDelete && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex-shrink-0 p-2 rounded-lg text-muted hover:text-danger hover:bg-danger/10 active:scale-95"
          title="Remove book"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
}
