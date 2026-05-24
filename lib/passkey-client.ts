import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  WebAuthnError,
} from '@simplewebauthn/browser';
import type { AuthMeResponse } from './types';

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || 'Passkey request failed');
  }

  return data as T;
}

function assertPasskeySupport() {
  if (!browserSupportsWebAuthn()) {
    throw new Error('This browser does not support passkeys.');
  }
}

function getPasskeyErrorMessage(error: unknown, ceremony: 'sign-in' | 'setup'): string {
  const fallback = ceremony === 'sign-in'
    ? 'Passkey sign-in failed. Please try again.'
    : 'Passkey setup failed. Please try again.';
  const cancelledMessage = ceremony === 'sign-in'
    ? 'Sign in was cancelled.'
    : 'Passkey setup was cancelled.';

  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error instanceof WebAuthnError) {
    switch (error.code) {
      case 'ERROR_CEREMONY_ABORTED':
      case 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY':
        return cancelledMessage;
      case 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED':
        return 'That passkey is already set up. Try signing in instead.';
      case 'ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT':
        return 'This device cannot create the kind of passkey Next Book needs.';
      case 'ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT':
      case 'ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE':
        return 'This device needs a screen lock, PIN, fingerprint, or face unlock before it can use passkeys.';
      case 'ERROR_INVALID_DOMAIN':
      case 'ERROR_INVALID_RP_ID':
        return 'Passkeys are not configured for this website address.';
      case 'ERROR_AUTHENTICATOR_GENERAL_ERROR':
      case 'ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG':
      case 'ERROR_INVALID_USER_ID_LENGTH':
      case 'ERROR_MALFORMED_PUBKEYCREDPARAMS':
        return fallback;
    }
  }

  if (
    error.name === 'AbortError' ||
    error.name === 'NotAllowedError' ||
    /timed out|not allowed|privacy-considerations/i.test(error.message)
  ) {
    return cancelledMessage;
  }

  return error.message || fallback;
}

async function completeRegistration(
  optionsJSON: Parameters<typeof startRegistration>[0]['optionsJSON'],
  fallback: 'setup'
) {
  try {
    return await startRegistration({ optionsJSON });
  } catch (error) {
    throw new Error(getPasskeyErrorMessage(error, fallback));
  }
}

async function completeAuthentication(
  optionsJSON: Parameters<typeof startAuthentication>[0]['optionsJSON']
) {
  try {
    return await startAuthentication({ optionsJSON });
  } catch (error) {
    throw new Error(getPasskeyErrorMessage(error, 'sign-in'));
  }
}

export async function registerWithPasskey(displayName: string, claimPollId?: string): Promise<AuthMeResponse> {
  assertPasskeySupport();

  const optionsJSON = await parseResponse<Parameters<typeof startRegistration>[0]['optionsJSON']>(
    await fetch('/api/auth/register/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, claimPollId }),
    })
  );

  const registration = await completeRegistration(optionsJSON, 'setup');

  return parseResponse<AuthMeResponse>(
    await fetch('/api/auth/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registration),
    })
  );
}

export async function loginWithPasskey(): Promise<AuthMeResponse> {
  assertPasskeySupport();

  const optionsJSON = await parseResponse<Parameters<typeof startAuthentication>[0]['optionsJSON']>(
    await fetch('/api/auth/login/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  );

  const authentication = await completeAuthentication(optionsJSON);

  return parseResponse<AuthMeResponse>(
    await fetch('/api/auth/login/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authentication),
    })
  );
}

export async function addPasskey(): Promise<AuthMeResponse> {
  assertPasskeySupport();

  const optionsJSON = await parseResponse<Parameters<typeof startRegistration>[0]['optionsJSON']>(
    await fetch('/api/auth/passkeys/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  );

  const registration = await completeRegistration(optionsJSON, 'setup');

  return parseResponse<AuthMeResponse>(
    await fetch('/api/auth/passkeys/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registration),
    })
  );
}
