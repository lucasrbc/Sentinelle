import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from './sign-out-button';

// Page personnelle : dépend de la session → rendu dynamique.
export const dynamic = 'force-dynamic';

interface Profile {
  email: string;
  name: string | null;
  role: 'DONOR' | 'PROJECT_OWNER' | 'ADMIN';
  organizationId: string | null;
}

const ROLE_LABELS: Record<Profile['role'], string> = {
  DONOR: 'Donateur',
  PROJECT_OWNER: 'Porteur de projet',
  ADMIN: 'Administrateur',
};

export default async function AccountPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let profile: Profile | null = null;
  if (session) {
    const res = await apiFetch('/me', session.access_token);
    if (res.ok) {
      profile = (await res.json()) as Profile;
    }
  }

  return (
    <main className="container">
      <h1>Mon compte</h1>

      {profile ? (
        <dl>
          <dt>
            <strong>Email</strong>
          </dt>
          <dd>{profile.email}</dd>
          <dt style={{ marginTop: '0.75rem' }}>
            <strong>Rôle</strong>
          </dt>
          <dd>{ROLE_LABELS[profile.role]}</dd>
        </dl>
      ) : (
        <p className="muted">
          Profil indisponible (l'API n'a pas pu être jointe). Vérifiez que le
          service est démarré.
        </p>
      )}

      {profile && profile.role === 'DONOR' ? (
        <p style={{ marginTop: '1.5rem' }}>
          Vous représentez une commune ou une association ?{' '}
          <Link href="/account/organization">Créer votre organisation</Link>{' '}
          pour devenir porteur de projet.
        </p>
      ) : null}

      <div style={{ marginTop: '2rem' }}>
        <SignOutButton />
      </div>
    </main>
  );
}
