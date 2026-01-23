import { NextResponse } from 'next/server';
import { getPoll, savePoll } from '@/lib/kv';
import { ToggleExcludeRequest, Activity, Voter } from '@/lib/types';

/**
 * Gets a unique identifier for a voter. For new voters this is their sessionId,
 * but for legacy voters (created before sessionId was required), we generate
 * a fallback identifier from their name and completedAt timestamp.
 */
function getVoterKey(voter: Voter): string {
  return voter.sessionId || `legacy-${voter.name}-${voter.completedAt}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: ToggleExcludeRequest = await request.json();
    
    // Validate input
    if (!body.voterKey || typeof body.voterKey !== 'string') {
      return NextResponse.json(
        { error: 'Voter key is required' },
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

    // Find the voter by their key (sessionId for new voters, legacy key for old voters)
    const voterIndex = poll.voters.findIndex(
      v => v.completedAt && getVoterKey(v) === body.voterKey
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
