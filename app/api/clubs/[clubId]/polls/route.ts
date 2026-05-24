import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getRequiredAccount } from '@/lib/auth';
import { getClub, getClubMember, saveClub, savePoll } from '@/lib/kv';
import type { CreateClubPollRequest, Poll } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const auth = await getRequiredAccount();
    if (!auth) {
      return NextResponse.json(
        { error: 'Sign in before creating a poll' },
        { status: 401 }
      );
    }

    const club = await getClub(clubId);
    if (!club) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      );
    }

    const member = await getClubMember(club.id, auth.account.id);
    if (!member) {
      return NextResponse.json(
        { error: 'Join this club before creating a poll' },
        { status: 403 }
      );
    }

    const body: CreateClubPollRequest = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json(
        { error: 'Poll name is required' },
        { status: 400 }
      );
    }

    const poll: Poll = {
      id: nanoid(10),
      name,
      clubId: club.id,
      createdByAccountId: auth.account.id,
      createdAt: Date.now(),
      books: [],
      voters: [],
      activityLog: [],
    };

    club.pollIds.push(poll.id);

    await savePoll(poll);
    await saveClub(club);

    return NextResponse.json({ club, poll }, { status: 201 });
  } catch (error) {
    console.error('Error creating club poll:', error);
    return NextResponse.json(
      { error: 'Failed to create poll' },
      { status: 500 }
    );
  }
}
