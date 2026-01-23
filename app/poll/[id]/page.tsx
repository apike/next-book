import { Metadata } from 'next';
import { getPoll } from '@/lib/kv';
import { getOrCreateSession } from '@/lib/session';
import PollPageClient from './PollPageClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const poll = await getPoll(id);
  
  if (!poll) {
    return {
      title: 'Poll Not Found - Book Club Poll',
      description: 'This poll could not be found.',
    };
  }

  const title = `${poll.name} - Book Club Poll`;
  const description = `Vote on books for ${poll.name}. A simple voting app for your book club.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function PollPage({ params }: PageProps) {
  const { id } = await params;
  
  // Get or create session (cookie set by middleware, this creates Redis record if needed)
  const session = await getOrCreateSession();
  
  // Fetch poll to check if this session has already voted
  const poll = await getPoll(id);
  
  // Session should always exist (middleware sets cookie), but handle edge case
  const sessionId = session?.id ?? '';
  
  // Check if this session has already voted in this poll (must have completedAt set)
  const existingVoter = session ? poll?.voters.find(v => v.sessionId === session.id && v.completedAt) : null;
  const hasVotedInPoll = !!existingVoter;
  
  // Use the name from the existing vote if they voted, otherwise from session
  const initialName = existingVoter?.name ?? session?.name ?? '';
  
  // Restore rankings if they've already voted
  const initialRankings = existingVoter?.rankings ?? [];
  
  return (
    <PollPageClient 
      pollId={id}
      sessionId={sessionId}
      initialName={initialName}
      hasVotedInPoll={hasVotedInPoll}
      initialRankings={initialRankings}
    />
  );
}
