import { NextResponse } from 'next/server';
import { getAuthMe } from '@/lib/auth';

export async function GET() {
  try {
    return NextResponse.json(await getAuthMe());
  } catch (error) {
    console.error('Error fetching auth session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch auth session' },
      { status: 500 }
    );
  }
}
