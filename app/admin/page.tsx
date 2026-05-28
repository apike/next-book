import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRequiredAdmin } from '@/lib/auth';
import { getAccountCredentialIds, getAllClubs, getAllPolls } from '@/lib/kv';
import AdminPageClient from './AdminPageClient';

export const metadata: Metadata = {
  title: 'Admin - Next Book',
  description: 'Admin tools for Next Book.',
};

export default async function AdminPage() {
  const auth = await getRequiredAdmin();
  if (!auth) {
    notFound();
  }

  const [polls, clubs, credentialIds] = await Promise.all([
    getAllPolls(),
    getAllClubs(),
    getAccountCredentialIds(auth.account.id),
  ]);

  return (
    <AdminPageClient
      account={auth.account}
      credentialCount={credentialIds.length}
      initialPolls={polls}
      initialClubs={clubs}
    />
  );
}
