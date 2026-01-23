import { NextResponse } from 'next/server';
import { getPoll, savePoll } from '@/lib/kv';
import { ToggleExcludeRequest, Activity } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: ToggleExcludeRequest = await request.json();
    
    // Validate input
    if (!body.voterSessionId || typeof body.voterSessionId !== 'string') {
      return NextResponse.json(
        { error: 'Voter session ID is required' },
        { status: 400 }
      );
    }

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

    // Find the voter by sessionId
    const voterIndex = poll.voters.findIndex(
      v => v.sessionId === body.voterSessionId && v.completedAt
    );

    if (voterIndex === -1) {
      return NextResponse.json(
        { error: 'Voter not found' },
        { status: 404 }
      );
    }

    const voter = poll.voters[voterIndex];
    const wasExcluded = voter.excluded ?? false;
    
    // Toggle the excluded status
    voter.excluded = !wasExcluded;

    // Log the activity
    const activity: Activity = {
      timestamp: Date.now(),
      type: voter.excluded ? 'voter_excluded' : 'voter_included',
      actor: body.actorName.trim(),
      detail: voter.name,
    };

    poll.activityLog.push(activity);
    
    await savePoll(poll);

    return NextResponse.json(poll);
  } catch (error) {
    console.error('Error toggling voter exclusion:', error);
    return NextResponse.json(
      { error: 'Failed to toggle voter exclusion' },
      { status: 500 }
    );
  }
}
