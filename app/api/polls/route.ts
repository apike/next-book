import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Create a club before creating a poll' },
    { status: 400 }
  );
}
