import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import {
  addAccountCredentialId,
  deleteAuthChallenge,
  getAuthChallenge,
  getPasskeyCredential,
  savePasskeyCredential,
} from '@/lib/kv';
import { getAuthMe, getRequiredAccount } from '@/lib/auth';
import { publicKeyToBase64URL } from '@/lib/webauthn';
import type { PasskeyCredential } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const auth = await getRequiredAccount();
    if (!auth) {
      return NextResponse.json(
        { error: 'Sign in before adding a passkey' },
        { status: 401 }
      );
    }

    const challenge = await getAuthChallenge(auth.session.id);
    if (!challenge || challenge.type !== 'add-passkey' || challenge.accountId !== auth.account.id) {
      return NextResponse.json(
        { error: 'Passkey setup expired. Please try again.' },
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
        { error: 'Passkey could not be verified' },
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

    const passkeyCredential: PasskeyCredential = {
      id: credential.id,
      accountId: auth.account.id,
      publicKey: publicKeyToBase64URL(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports,
      credentialDeviceType,
      credentialBackedUp,
      createdAt: Date.now(),
    };

    await savePasskeyCredential(passkeyCredential);
    await addAccountCredentialId(auth.account.id, credential.id);
    await deleteAuthChallenge(auth.session.id);

    return NextResponse.json(await getAuthMe());
  } catch (error) {
    console.error('Error verifying additional passkey:', error);
    return NextResponse.json(
      { error: 'Failed to verify passkey' },
      { status: 500 }
    );
  }
}
