import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import {
  deleteAuthChallenge,
  getAccount,
  getAuthChallenge,
  getPasskeyCredential,
  savePasskeyCredential,
  saveSession,
} from '@/lib/kv';
import { getAuthMe } from '@/lib/auth';
import { getOrCreateSession } from '@/lib/session';
import { toWebAuthnCredential } from '@/lib/webauthn';

export async function POST(request: Request) {
  try {
    const session = await getOrCreateSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Session is required' },
        { status: 400 }
      );
    }

    const challenge = await getAuthChallenge(session.id);
    if (!challenge || challenge.type !== 'login') {
      return NextResponse.json(
        { error: 'Passkey login expired. Please try again.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const credentialId = typeof body.id === 'string' ? body.id : '';
    const credential = credentialId ? await getPasskeyCredential(credentialId) : null;
    if (!credential) {
      return NextResponse.json(
        { error: 'Passkey was not recognized' },
        { status: 400 }
      );
    }

    const verification = await verifyAuthenticationResponse({
      response: body as Parameters<typeof verifyAuthenticationResponse>[0]['response'],
      expectedChallenge: challenge.challenge,
      expectedOrigin: challenge.origin,
      expectedRPID: challenge.rpID,
      credential: toWebAuthnCredential(credential),
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Passkey login could not be verified' },
        { status: 400 }
      );
    }

    const account = await getAccount(credential.accountId);
    if (!account) {
      return NextResponse.json(
        { error: 'Passkey account was not found' },
        { status: 400 }
      );
    }

    credential.counter = verification.authenticationInfo.newCounter;
    credential.credentialDeviceType = verification.authenticationInfo.credentialDeviceType;
    credential.credentialBackedUp = verification.authenticationInfo.credentialBackedUp;
    credential.lastUsedAt = Date.now();

    session.accountId = account.id;
    session.name = session.name || account.displayName;

    await savePasskeyCredential(credential);
    await saveSession(session);
    await deleteAuthChallenge(session.id);

    return NextResponse.json(await getAuthMe());
  } catch (error) {
    console.error('Error verifying login:', error);
    return NextResponse.json(
      { error: 'Failed to verify passkey login' },
      { status: 500 }
    );
  }
}
