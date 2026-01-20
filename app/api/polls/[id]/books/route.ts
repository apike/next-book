import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getPoll, savePoll } from '@/lib/kv';
import { AddBookRequest, Book, Activity } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: AddBookRequest = await request.json();
    
    // Validate input
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Book title is required' },
        { status: 400 }
      );
    }
    
    if (!body.author || typeof body.author !== 'string' || body.author.trim().length === 0) {
      return NextResponse.json(
        { error: 'Author name is required' },
        { status: 400 }
      );
    }
    
    if (!body.addedBy || typeof body.addedBy !== 'string' || body.addedBy.trim().length === 0) {
      return NextResponse.json(
        { error: 'Your name is required' },
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

    const newBook: Book = {
      id: nanoid(8),
      title: body.title.trim(),
      author: body.author.trim(),
      addedBy: body.addedBy.trim(),
      addedAt: Date.now(),
    };

    const activity: Activity = {
      timestamp: Date.now(),
      type: 'book_added',
      actor: body.addedBy.trim(),
      detail: `${newBook.title} by ${newBook.author}`,
    };

    poll.books.push(newBook);
    poll.activityLog.push(activity);
    
    await savePoll(poll);

    return NextResponse.json(poll, { status: 201 });
  } catch (error) {
    console.error('Error adding book:', error);
    return NextResponse.json(
      { error: 'Failed to add book' },
      { status: 500 }
    );
  }
}
