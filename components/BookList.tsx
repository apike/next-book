'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  CollisionDetection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Book } from '@/lib/types';
import { BookCard } from './BookCard';

interface BookListProps {
  books: Book[];
  rankedBookIds: string[];
  onRankingsChange: (rankings: string[]) => void;
  disabled?: boolean;
}

interface SortableBookProps {
  book: Book;
  rank?: number;
  disabled?: boolean;
  showRank?: boolean;
}

interface DroppableAreaProps {
  id: string;
  children: React.ReactNode;
  isOver?: boolean;
}

function DroppableArea({ id, children, isOver }: DroppableAreaProps) {
  const { setNodeRef } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`min-h-[60px] rounded-xl transition-colors ${isOver ? 'bg-primary/5' : ''}`}
    >
      {children}
    </div>
  );
}

// Custom collision detection that prefers sortable items over droppable containers
const customCollisionDetection: CollisionDetection = (args) => {
  // First, check for intersections with sortable items using pointerWithin
  const pointerCollisions = pointerWithin(args);
  
  // Filter to prefer actual book items over container droppables
  const itemCollisions = pointerCollisions.filter(
    collision => !collision.id.toString().includes('droppable')
  );
  
  // If we have item collisions, use those
  if (itemCollisions.length > 0) {
    return itemCollisions;
  }
  
  // Fall back to all pointer collisions (including droppable areas)
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  
  // Last resort: use rectIntersection for when pointer is outside but rect overlaps
  return rectIntersection(args);
};

function SortableBook({ book, rank, disabled, showRank = true }: SortableBookProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: book.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2 last:mb-0">
      <BookCard
        book={book}
        rank={showRank ? rank : undefined}
        canDelete={false}
        isDragging={isDragging}
        dragHandleProps={disabled ? undefined : { ...attributes, ...listeners }}
      />
    </div>
  );
}

export function BookList({
  books,
  rankedBookIds,
  onRankingsChange,
  disabled,
}: BookListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isOverRanked, setIsOverRanked] = useState(false);
  const [isOverUnranked, setIsOverUnranked] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Books that haven't been ranked yet
  const unrankedBooks = books.filter(b => !rankedBookIds.includes(b.id));
  const unrankedBookIds = unrankedBooks.map(b => b.id);
  
  // Get ranked books in order
  const rankedBooks = rankedBookIds
    .map(id => books.find(b => b.id === id))
    .filter((b): b is Book => b !== undefined);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const isActiveDragUnranked = unrankedBookIds.includes(active.id as string);
    
    setOverId(over?.id as string | null);
    
    // If dragging from unranked, always show as "over ranked" since it will always go there
    if (isActiveDragUnranked) {
      setIsOverRanked(true);
      setIsOverUnranked(false);
    } else {
      setIsOverRanked(over?.id === 'ranked-droppable' || rankedBookIds.includes(over?.id as string));
      setIsOverUnranked(over?.id === 'unranked-droppable' || unrankedBookIds.includes(over?.id as string));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    setIsOverRanked(false);
    setIsOverUnranked(false);

    const activeIdStr = active.id as string;
    const isActiveRanked = rankedBookIds.includes(activeIdStr);
    const isActiveUnranked = unrankedBookIds.includes(activeIdStr);

    // If dragging from unranked, ALWAYS add to rankings
    // (unranked items can't be reordered - they just get ranked)
    if (isActiveUnranked) {
      if (over && rankedBookIds.includes(over.id as string)) {
        // Dropped on a specific ranked item - insert at that position
        const overIndex = rankedBookIds.indexOf(over.id as string);
        const newRankings = [...rankedBookIds];
        newRankings.splice(overIndex, 0, activeIdStr);
        onRankingsChange(newRankings);
      } else {
        // Dropped anywhere else (including unranked area) - add to end of rankings
        onRankingsChange([...rankedBookIds, activeIdStr]);
      }
      return;
    }

    // From here, we're dealing with ranked items
    if (!over) return;

    const overIdStr = over.id as string;
    const isDroppingOnUnrankedArea = overIdStr === 'unranked-droppable' || unrankedBookIds.includes(overIdStr);
    const isDroppingOnRankedArea = overIdStr === 'ranked-droppable' || rankedBookIds.includes(overIdStr);

    // Moving from ranked to unranked
    if (isActiveRanked && isDroppingOnUnrankedArea) {
      onRankingsChange(rankedBookIds.filter(id => id !== activeIdStr));
      return;
    }

    // Reordering within ranked
    if (isActiveRanked && isDroppingOnRankedArea && activeIdStr !== overIdStr) {
      if (overIdStr !== 'ranked-droppable') {
        const oldIndex = rankedBookIds.indexOf(activeIdStr);
        const newIndex = rankedBookIds.indexOf(overIdStr);
        if (oldIndex !== -1 && newIndex !== -1) {
          onRankingsChange(arrayMove(rankedBookIds, oldIndex, newIndex));
        }
      }
    }
  };

  const activeBook = activeId ? books.find(b => b.id === activeId) : null;
  const isActiveRanked = activeId ? rankedBookIds.includes(activeId) : false;

  // Compute preview of ranked order during drag for live rank updates
  const previewRankedIds = (() => {
    if (!activeId || !overId) return rankedBookIds;
    
    const isActiveDragRanked = rankedBookIds.includes(activeId);
    const isOverRankedItem = rankedBookIds.includes(overId);
    
    // Only show preview when reordering within ranked section
    if (isActiveDragRanked && isOverRankedItem && activeId !== overId) {
      const oldIndex = rankedBookIds.indexOf(activeId);
      const newIndex = rankedBookIds.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        return arrayMove(rankedBookIds, oldIndex, newIndex);
      }
    }
    
    return rankedBookIds;
  })();


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Your Rankings - always shown at top */}
        <div>
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
            Your Rankings {rankedBooks.length > 0 && `(${rankedBooks.length})`}
          </h3>
          <SortableContext
            items={rankedBookIds}
            strategy={verticalListSortingStrategy}
          >
            <DroppableArea id="ranked-droppable" isOver={isOverRanked && !isActiveRanked}>
              {rankedBooks.length > 0 ? (
                <div>
                  {rankedBooks.map((book) => {
                    // Use preview order for rank number during drag
                    const previewRank = previewRankedIds.indexOf(book.id) + 1;
                    return (
                      <SortableBook
                        key={book.id}
                        book={book}
                        rank={previewRank}
                        disabled={disabled}
                        showRank={true}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className={`
                  border-2 border-dashed rounded-xl p-8 text-center transition-colors
                  ${isOverRanked ? 'border-primary bg-primary/5' : 'border-card-border'}
                `}>
                  <svg className="w-8 h-8 mx-auto mb-2 text-muted opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  <p className="text-sm text-muted">
                    {disabled ? 'No rankings' : 'Drag a book here to rank it'}
                  </p>
                </div>
              )}
            </DroppableArea>
          </SortableContext>
        </div>

        {/* Unranked books */}
        {(unrankedBooks.length > 0 || books.length > 0) && (
          <div>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
              Unranked {unrankedBooks.length > 0 && `(${unrankedBooks.length})`}
            </h3>
            <SortableContext
              items={unrankedBookIds}
              strategy={verticalListSortingStrategy}
            >
              <DroppableArea id="unranked-droppable" isOver={isOverUnranked && isActiveRanked}>
                {unrankedBooks.length > 0 ? (
                  <div>
                    {unrankedBooks.map((book) => (
                      <SortableBook
                        key={book.id}
                        book={book}
                        disabled={disabled}
                        showRank={false}
                      />
                    ))}
                  </div>
                ) : rankedBooks.length > 0 ? (
                  <div className={`
                    border-2 border-dashed rounded-xl p-6 text-center transition-colors
                    ${isOverUnranked ? 'border-primary bg-primary/5' : 'border-card-border'}
                  `}>
                    <p className="text-sm text-muted">
                      {disabled ? 'All books ranked' : 'Drag a book here to unrank it'}
                    </p>
                  </div>
                ) : null}
              </DroppableArea>
            </SortableContext>
          </div>
        )}

        {/* Empty state */}
        {books.length === 0 && (
          <div className="text-center py-12 text-muted">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p>No books yet. Go to the Add Books tab to get started!</p>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeBook ? (
          <BookCard
            book={activeBook}
            rank={isActiveRanked ? previewRankedIds.indexOf(activeBook.id) + 1 : undefined}
            canDelete={false}
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
