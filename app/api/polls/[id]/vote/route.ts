import { NextResponse } from 'next/server';
import { getPoll, savePoll } from '@/lib/kv';
import { SubmitVoteRequest, Voter, Activity } from '@/lib/types';

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

    const poll = await getPoll(id);
    
    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
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

    // Check if this voter name already exists and has completed
    const existingVoterIndex = poll.voters.findIndex(
      v => v.name.toLowerCase() === body.voterName.trim().toLowerCase() && v.completedAt
    );

    if (existingVoterIndex !== -1) {
      return NextResponse.json(
        { error: 'A voter with this name has already completed voting' },
        { status: 400 }
      );
    }

    const voter: Voter = {
      name: body.voterName.trim(),
      rankings: body.rankings,
      completedAt: Date.now(),
    };

    const activity: Activity = {
      timestamp: Date.now(),
      type: 'voting_complete',
      actor: body.voterName.trim(),
    };

    // Remove any existing incomplete vote from same name, then add the completed one
    const existingIncompleteIndex = poll.voters.findIndex(
      v => v.name.toLowerCase() === body.voterName.trim().toLowerCase() && !v.completedAt
    );
    
    if (existingIncompleteIndex !== -1) {
      poll.voters.splice(existingIncompleteIndex, 1);
    }

    poll.voters.push(voter);
    poll.activityLog.push(activity);
    
    await savePoll(poll);

    return NextResponse.json(poll);
  } catch (error) {
    console.error('Error submitting vote:', error);
    return NextResponse.json(
      { error: 'Failed to submit vote' },
      { status: 500 }
    );
  }
}
