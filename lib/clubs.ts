import { nanoid } from 'nanoid';
import type { Account, ClubMember } from './types';
import { addAccountClubId, getClubMember, saveClubMember } from './kv';

export async function ensureClubMember(clubId: string, account: Account): Promise<ClubMember> {
  const existingMember = await getClubMember(clubId, account.id);
  if (existingMember) {
    await addAccountClubId(account.id, clubId);
    return existingMember;
  }

  const now = Date.now();
  const member: ClubMember = {
    id: nanoid(10),
    clubId,
    accountId: account.id,
    displayName: account.displayName,
    joinedAt: now,
    verifiedAt: now,
  };

  await saveClubMember(member);
  return member;
}
