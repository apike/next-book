import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import {
  addAccountCredentialId,
  deleteAuthChallenge,
  getAuthChallenge,
  getPasskeyCredential,
  saveAccount,
  savePasskeyCredential,
  saveSession,
} from '@/lib/kv';
import { getAuthMe } from '@/lib/auth';
import { getOrCreateSession } from '@/lib/session';
import { claimSessionVoteForAccount } from '@/lib/vote-claims';
import { publicKeyToBase64URL } from '@/lib/webauthn';
import type { Account, PasskeyCredential } from '@/lib/types';

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
    if (!challenge || challenge.type !== 'register' || !challenge.accountId || !challenge.displayName) {
      return NextResponse.json(
        { error: 'Passkey registration expired. Please try again.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const verification = await verifyRegistrationResponse({
      response: body as Parameters<typeof verifyRegistrationResponse>[0]['response'],
      expectedChallenge: challenge.challenge,
      expectedOrigin: challenge.origin,
      expectedRPID: challenge.rpID,
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Passkey registration could not be verified' },
        { status: 400 }
      );
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const existingCredential = await getPasskeyCredential(credential.id);
    if (existingCredential) {
      return NextResponse.json(
        { error: 'This passkey is already registered' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const account: Account = {
      id: challenge.accountId,
      displayName: challenge.displayName,
      createdAt: now,
      updatedAt: now,
    };

    const passkeyCredential: PasskeyCredential = {
      id: credential.id,
      accountId: account.id,
      publicKey: publicKeyToBase64URL(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports,
      credentialDeviceType,
      credentialBackedUp,
      createdAt: now,
    };

    await saveAccount(account);
    await savePasskeyCredential(passkeyCredential);
    await addAccountCredentialId(account.id, credential.id);
    session.accountId = account.id;
    session.name = session.name || account.displayName;
    await saveSession(session);
    if (challenge.claimPollId) {
      await claimSessionVoteForAccount(challenge.claimPollId, session, account);
    }
    await deleteAuthChallenge(session.id);

    return NextResponse.json(await getAuthMe());
  } catch (error) {
    console.error('Error verifying registration:', error);
    return NextResponse.json(
      { error: 'Failed to verify passkey registration' },
      { status: 500 }
    );
  }
}
