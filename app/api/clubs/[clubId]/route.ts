import { NextResponse } from 'next/server';
import { getAuthMe } from '@/lib/auth';
import { getClub, getClubMember, getClubMembers, getPoll } from '@/lib/kv';
import type { Poll } from '@/lib/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const club = await getClub(clubId);

    if (!club) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      );
    }

    const members = await getClubMembers(club.id);
    const polls = (await Promise.all(club.pollIds.map((pollId) => getPoll(pollId))))
      .filter((poll): poll is Poll => poll !== null);
    const auth = await getAuthMe();
    const currentMember = auth.account
      ? await getClubMember(club.id, auth.account.id)
      : null;

    return NextResponse.json({
      club,
      members,
      polls,
      currentMember,
      isVerifiedMember: !!currentMember,
    });
  } catch (error) {
    console.error('Error fetching club:', error);
    return NextResponse.json(
      { error: 'Failed to fetch club' },
      { status: 500 }
    );
  }
}
