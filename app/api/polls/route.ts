import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { savePoll } from '@/lib/kv';
import { Poll, CreatePollRequest } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body: CreatePollRequest = await request.json();
    
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Poll name is required' },
        { status: 400 }
      );
    }

    const poll: Poll = {
      id: nanoid(10), // Short, URL-friendly ID
      name: body.name.trim(),
      createdAt: Date.now(),
      books: [],
      voters: [],
      activityLog: [],
    };

    await savePoll(poll);

    return NextResponse.json(poll, { status: 201 });
  } catch (error) {
    console.error('Error creating poll:', error);
    return NextResponse.json(
      { error: 'Failed to create poll' },
      { status: 500 }
    );
  }
}
