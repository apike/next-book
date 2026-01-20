import { Metadata } from 'next';
import { getPoll } from '@/lib/kv';
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
  return <PollPageClient pollId={id} />;
}
