import type { WebAuthnCredential } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type { PasskeyCredential } from './types';

export const rpName = 'Next Book';

export function getWebAuthnConfig(request: Request): { origin: string; rpID: string; rpName: string } {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host') || url.host;
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProto || url.protocol.replace(':', '');
  const hostname = host.split(':')[0];

  return {
    origin: process.env.WEBAUTHN_ORIGIN || `${protocol}://${host}`,
    rpID: process.env.WEBAUTHN_RP_ID || hostname,
    rpName,
  };
}

export function publicKeyToBase64URL(publicKey: Parameters<typeof isoBase64URL.fromBuffer>[0]): string {
  return isoBase64URL.fromBuffer(publicKey);
}

export function toWebAuthnCredential(credential: PasskeyCredential): WebAuthnCredential {
  return {
    id: credential.id,
    publicKey: isoBase64URL.toBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports,
  };
}
