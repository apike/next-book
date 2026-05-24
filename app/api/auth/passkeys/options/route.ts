import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getRequiredAccount } from '@/lib/auth';
import { getAccountCredentials, saveAuthChallenge } from '@/lib/kv';
import { getWebAuthnConfig } from '@/lib/webauthn';

export async function POST(request: Request) {
  try {
    const auth = await getRequiredAccount();
    if (!auth) {
      return NextResponse.json(
        { error: 'Sign in before adding a passkey' },
        { status: 401 }
      );
    }

    const existingCredentials = await getAccountCredentials(auth.account.id);
    const config = getWebAuthnConfig(request);
    const options = await generateRegistrationOptions({
      rpName: config.rpName,
      rpID: config.rpID,
      userID: new TextEncoder().encode(auth.account.id),
      userName: auth.account.displayName,
      userDisplayName: auth.account.displayName,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map((credential) => ({
        id: credential.id,
        transports: credential.transports,
      })),
      authenticatorSelection: {
        residentKey: 'required',
        requireResidentKey: true,
        userVerification: 'required',
      },
    });

    await saveAuthChallenge({
      sessionId: auth.session.id,
      type: 'add-passkey',
      challenge: options.challenge,
      accountId: auth.account.id,
      rpID: config.rpID,
      origin: config.origin,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error('Error creating add-passkey options:', error);
    return NextResponse.json(
      { error: 'Failed to start passkey setup' },
      { status: 500 }
    );
  }
}
