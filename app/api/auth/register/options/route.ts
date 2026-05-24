import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { nanoid } from 'nanoid';
import { getOrCreateSession } from '@/lib/session';
import { getWebAuthnConfig } from '@/lib/webauthn';
import { saveAuthChallenge } from '@/lib/kv';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    const claimPollId = typeof body.claimPollId === 'string' && body.claimPollId.trim()
      ? body.claimPollId.trim()
      : undefined;

    if (!displayName) {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      );
    }

    const session = await getOrCreateSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Session is required' },
        { status: 400 }
      );
    }

    if (session.accountId) {
      return NextResponse.json(
        { error: 'You are already signed in' },
        { status: 400 }
      );
    }

    const accountId = nanoid(16);
    const config = getWebAuthnConfig(request);
    const options = await generateRegistrationOptions({
      rpName: config.rpName,
      rpID: config.rpID,
      userID: new TextEncoder().encode(accountId),
      userName: displayName,
      userDisplayName: displayName,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        requireResidentKey: true,
        userVerification: 'required',
      },
    });

    await saveAuthChallenge({
      sessionId: session.id,
      type: 'register',
      challenge: options.challenge,
      accountId,
      displayName,
      claimPollId,
      rpID: config.rpID,
      origin: config.origin,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error('Error creating registration options:', error);
    return NextResponse.json(
      { error: 'Failed to start passkey registration' },
      { status: 500 }
    );
  }
}
