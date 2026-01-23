import { NextResponse } from 'next/server';
import { getPoll, savePoll } from '@/lib/kv';
import { Activity } from '@/lib/types';

export interface PeekRequest {
  actorName: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: PeekRequest = await request.json();
    
    // Validate input
    if (!body.actorName || typeof body.actorName !== 'string' || body.actorName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Actor name is required' },
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

    // Log the activity
    const activity: Activity = {
      timestamp: Date.now(),
      type: 'results_peeked',
      actor: body.actorName.trim(),
    };

    poll.activityLog.push(activity);
    
    await savePoll(poll);

    return NextResponse.json(poll);
  } catch (error) {
    console.error('Error logging peek:', error);
    return NextResponse.json(
      { error: 'Failed to log peek' },
      { status: 500 }
    );
  }
}
