import { NextResponse } from 'next/server';
import { getRequiredAccount } from '@/lib/auth';
import { ensureClubMember } from '@/lib/clubs';
import { getClub } from '@/lib/kv';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const auth = await getRequiredAccount();
    if (!auth) {
      return NextResponse.json(
        { error: 'Sign in before joining this club' },
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

    const member = await ensureClubMember(club.id, auth.account);
    return NextResponse.json({ club, member });
  } catch (error) {
    console.error('Error joining club:', error);
    return NextResponse.json(
      { error: 'Failed to join club' },
      { status: 500 }
    );
  }
}
