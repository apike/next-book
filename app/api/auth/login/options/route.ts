import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getOrCreateSession } from '@/lib/session';
import { saveAuthChallenge } from '@/lib/kv';
import { getWebAuthnConfig } from '@/lib/webauthn';

export async function POST(request: Request) {
  try {
    const session = await getOrCreateSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Session is required' },
        { status: 400 }
      );
    }

    const config = getWebAuthnConfig(request);
    const options = await generateAuthenticationOptions({
      rpID: config.rpID,
      userVerification: 'required',
    });

    await saveAuthChallenge({
      sessionId: session.id,
      type: 'login',
      challenge: options.challenge,
      rpID: config.rpID,
      origin: config.origin,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error('Error creating login options:', error);
    return NextResponse.json(
      { error: 'Failed to start passkey login' },
      { status: 500 }
    );
  }
}
