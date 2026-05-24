import type { Account, AuthMeResponse, Session } from './types';
import { getAccount, getAccountCredentialIds } from './kv';
import { getCurrentSession } from './session';

export async function getAuthMe(): Promise<AuthMeResponse> {
  const session = await getCurrentSession();
  if (!session?.accountId) {
    return { account: null, credentialCount: 0 };
  }

  const account = await getAccount(session.accountId);
  if (!account) {
    return { account: null, credentialCount: 0 };
  }

  const credentialIds = await getAccountCredentialIds(account.id);
  return {
    account,
    credentialCount: credentialIds.length,
  };
}

export async function getRequiredAccount(): Promise<{ session: Session; account: Account } | null> {
  const session = await getCurrentSession();
  if (!session?.accountId) {
    return null;
  }

  const account = await getAccount(session.accountId);
  if (!account) {
    return null;
  }

  return { session, account };
}
