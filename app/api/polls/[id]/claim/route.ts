import { NextResponse } from 'next/server';
import { getRequiredAccount } from '@/lib/auth';
import { claimSessionVoteForAccount } from '@/lib/vote-claims';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getRequiredAccount();
    if (!auth) {
      return NextResponse.json(
        { error: 'Sign in before claiming a vote' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const result = await claimSessionVoteForAccount(id, auth.session, auth.account);
    if (!result) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      );
    }

    if (result.conflict) {
      return NextResponse.json(
        { error: 'This account has already voted in this poll' },
        { status: 409 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error claiming poll vote:', error);
    return NextResponse.json(
      { error: 'Failed to claim vote' },
      { status: 500 }
    );
  }
}
