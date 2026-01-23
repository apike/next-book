import { NextResponse } from 'next/server';
import { getPoll, savePoll, getSession, saveSession } from '@/lib/kv';
import { SubmitVoteRequest, Voter, Activity } from '@/lib/types';

/**
 * Generates a unique name by appending a number if the name already exists.
 * e.g., "Mike" -> "Mike 2" if "Mike" is taken
 */
function generateUniqueName(baseName: string, existingNames: string[]): string {
  const lowerBaseName = baseName.toLowerCase();
  const existingLower = existingNames.map(n => n.toLowerCase());
  
  // If the name doesn't exist, use it as-is
  if (!existingLower.includes(lowerBaseName)) {
    return baseName;
  }
  
  // Find the next available number
  let counter = 2;
  while (existingLower.includes(`${lowerBaseName} ${counter}`)) {
    counter++;
  }
  
  return `${baseName} ${counter}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: SubmitVoteRequest = await request.json();
    
    // Validate input
    if (!body.voterName || typeof body.voterName !== 'string' || body.voterName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Your name is required' },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(body.rankings)) {
      return NextResponse.json(
        { error: 'Rankings must be an array' },
        { status: 400 }
      );
    }

    if (!body.sessionId || typeof body.sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Session ID is required' },
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

    // Check if this session has already voted in this poll
    const existingSessionVote = poll.voters.find(v => v.sessionId === body.sessionId && v.completedAt);
    if (existingSessionVote) {
      return NextResponse.json(
        { error: 'You have already voted in this poll' },
        { status: 400 }
      );
    }

    // Validate that all book IDs in rankings exist
    const bookIds = new Set(poll.books.map(b => b.id));
    for (const bookId of body.rankings) {
      if (!bookIds.has(bookId)) {
        return NextResponse.json(
          { error: 'Invalid book ID in rankings' },
          { status: 400 }
        );
      }
    }

    // Check if at least one book is ranked
    if (body.rankings.length === 0) {
      return NextResponse.json(
        { error: 'Please rank at least one book before submitting' },
        { status: 400 }
      );
    }

    // Get existing voter names (excluding incomplete votes from this session)
    const existingNames = poll.voters
      .filter(v => v.completedAt && v.sessionId !== body.sessionId)
      .map(v => v.name);

    // Generate unique name if there's a duplicate
    const uniqueName = generateUniqueName(body.voterName.trim(), existingNames);

    const voter: Voter = {
      name: uniqueName,
      sessionId: body.sessionId,
      rankings: body.rankings,
      completedAt: Date.now(),
    };

    const activity: Activity = {
      timestamp: Date.now(),
      type: 'voting_complete',
      actor: uniqueName,
    };

    // Remove any existing incomplete vote from this session, then add the completed one
    const existingIncompleteIndex = poll.voters.findIndex(
      v => v.sessionId === body.sessionId && !v.completedAt
    );
    
    if (existingIncompleteIndex !== -1) {
      poll.voters.splice(existingIncompleteIndex, 1);
    }

    poll.voters.push(voter);
    poll.activityLog.push(activity);
    
    await savePoll(poll);

    // Update session with the name if not already set
    const session = await getSession(body.sessionId);
    if (session && !session.name) {
      session.name = uniqueName;
      await saveSession(session);
    }

    return NextResponse.json(poll);
  } catch (error) {
    console.error('Error submitting vote:', error);
    return NextResponse.json(
      { error: 'Failed to submit vote' },
      { status: 500 }
    );
  }
}
