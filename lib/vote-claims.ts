import { ensureClubMember } from './clubs';
import { getPoll, savePoll } from './kv';
import type { Account, ClubMember, Poll, Session, Voter } from './types';

export interface ClaimSessionVoteResult {
  claimed: boolean;
  conflict: boolean;
  poll: Poll;
  voter?: Voter;
  clubMember?: ClubMember | null;
}

export async function claimSessionVoteForAccount(
  pollId: string,
  session: Session,
  account: Account
): Promise<ClaimSessionVoteResult | null> {
  const poll = await getPoll(pollId);
  if (!poll) {
    return null;
  }

  const voter = poll.voters.find(candidate => (
    candidate.completedAt &&
    candidate.sessionId === session.id
  ));

  if (!voter) {
    return { claimed: false, conflict: false, poll };
  }

  const clubMember = poll.clubId
    ? await ensureClubMember(poll.clubId, account)
    : null;
  const hasExistingVerifiedVote = poll.voters.some(candidate => (
    candidate !== voter &&
    candidate.completedAt &&
    (
      candidate.accountId === account.id ||
      (!!clubMember && candidate.clubMemberId === clubMember.id)
    )
  ));

  if (hasExistingVerifiedVote) {
    return { claimed: false, conflict: true, poll, voter, clubMember };
  }

  voter.accountId = account.id;
  voter.clubMemberId = clubMember?.id;
  voter.verified = !!clubMember;

  await savePoll(poll);

  return {
    claimed: true,
    conflict: false,
    poll,
    voter,
    clubMember,
  };
}
