import { Metadata } from 'next';
import { getClub } from '@/lib/kv';
import ClubPageClient from './ClubPageClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const club = await getClub(id);
    if (!club) {
      return {
        title: 'Club Not Found - Next Book',
        description: 'This book club could not be found.',
      };
    }

    return {
      title: `${club.name} - Next Book`,
      description: `Book polls for ${club.name}.`,
      openGraph: {
        title: `${club.name} - Next Book`,
        description: `Book polls for ${club.name}.`,
        images: ['/next-book.png'],
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: `${club.name} - Next Book`,
        description: `Book polls for ${club.name}.`,
        images: ['/next-book.png'],
      },
    };
  } catch (error) {
    console.error('Error fetching club for metadata:', error);
    return {
      title: 'Next Book',
      description: 'Book club ranked voting.',
    };
  }
}

export default async function ClubPage({ params }: PageProps) {
  const { id } = await params;
  return <ClubPageClient clubId={id} />;
}
