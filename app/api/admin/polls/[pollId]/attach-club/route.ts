import { NextResponse } from 'next/server';
import { getRequiredAdmin } from '@/lib/auth';
import { getClub, getPoll, saveClub, savePoll } from '@/lib/kv';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    const admin = await getRequiredAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { pollId } = await params;
    const body: { clubId?: unknown } = await request.json();
    const clubId = typeof body.clubId === 'string' ? body.clubId.trim() : '';

    if (!clubId) {
      return NextResponse.json(
        { error: 'Club ID is required' },
        { status: 400 }
      );
    }

    const [poll, club] = await Promise.all([
      getPoll(pollId),
      getClub(clubId),
    ]);

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      );
    }

    if (!club) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      );
    }

    if (poll.clubId && poll.clubId !== club.id) {
      return NextResponse.json(
        { error: 'Poll is already attached to another club' },
        { status: 409 }
      );
    }

    poll.clubId = club.id;
    if (!club.pollIds.includes(poll.id)) {
      club.pollIds.push(poll.id);
    }

    await savePoll(poll);
    await saveClub(club);

    return NextResponse.json({ poll, club });
  } catch (error) {
    console.error('Error attaching poll to club:', error);
    return NextResponse.json(
      { error: 'Failed to attach poll to club' },
      { status: 500 }
    );
  }
}
