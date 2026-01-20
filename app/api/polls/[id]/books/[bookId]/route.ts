import { NextResponse } from 'next/server';
import { getPoll, savePoll } from '@/lib/kv';
import { Activity } from '@/lib/types';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; bookId: string }> }
) {
  try {
    const { id, bookId } = await params;
    
    // Get actor name from query params
    const url = new URL(request.url);
    const actor = url.searchParams.get('actor');
    
    if (!actor) {
      return NextResponse.json(
        { error: 'Your name is required to delete a book' },
        { status: 400 }
      );
    }

    const poll = await getPoll(id);
    
    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      );
    }

    const bookIndex = poll.books.findIndex(b => b.id === bookId);
    
    if (bookIndex === -1) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    const book = poll.books[bookIndex];

    // Check if any voter has ranked this book
    const hasVotes = poll.voters.some(voter => 
      voter.rankings.includes(bookId)
    );

    if (hasVotes) {
      return NextResponse.json(
        { error: 'Cannot delete a book that has been voted for' },
        { status: 400 }
      );
    }

    const activity: Activity = {
      timestamp: Date.now(),
      type: 'book_deleted',
      actor: actor,
      detail: `${book.title} by ${book.author}`,
    };

    poll.books.splice(bookIndex, 1);
    poll.activityLog.push(activity);
    
    await savePoll(poll);

    return NextResponse.json(poll);
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { error: 'Failed to delete book' },
      { status: 500 }
    );
  }
}
