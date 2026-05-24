import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getRequiredAccount } from '@/lib/auth';
import { ensureClubMember } from '@/lib/clubs';
import { getAccountClubs, saveClub } from '@/lib/kv';
import type { Club, CreateClubRequest } from '@/lib/types';

export async function GET() {
  try {
    const auth = await getRequiredAccount();
    if (!auth) {
      return NextResponse.json(
        { error: 'Sign in before viewing your clubs' },
        { status: 401 }
      );
    }

    const clubs = await getAccountClubs(auth.account.id);
    clubs.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ clubs });
  } catch (error) {
    console.error('Error fetching account clubs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clubs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getRequiredAccount();
    if (!auth) {
      return NextResponse.json(
        { error: 'Sign in with a passkey before creating a club' },
        { status: 401 }
      );
    }

    const body: CreateClubRequest = await request.json();
    const clubName = typeof body.clubName === 'string' ? body.clubName.trim() : '';

    if (!clubName) {
      return NextResponse.json(
        { error: 'Club name is required' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const clubId = nanoid(10);
    const club: Club = {
      id: clubId,
      name: clubName,
      createdAt: now,
      createdByAccountId: auth.account.id,
      pollIds: [],
    };

    await saveClub(club);
    const member = await ensureClubMember(club.id, auth.account);

    return NextResponse.json({ club, member }, { status: 201 });
  } catch (error) {
    console.error('Error creating club:', error);
    return NextResponse.json(
      { error: 'Failed to create club' },
      { status: 500 }
    );
  }
}
