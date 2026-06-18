'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });

    setLoading(false);
    if (signUpError) {
      setError("La création du compte a échoué. Vérifiez vos informations.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main className="container">
        <h1>Vérifiez votre boîte mail</h1>
        <p>
          Un email de confirmation vient de vous être envoyé. Cliquez sur le
          lien qu'il contient pour activer votre compte.
        </p>
        <p>
          <Link href="/login">Retour à la connexion</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Créer un compte</h1>
      <p className="muted">
        Rejoignez Sentinelle pour soutenir le patrimoine près de chez vous.
      </p>

      {error ? (
        <p className="alert-error" role="alert">
          {error}
        </p>
      ) : null}

      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Adresse email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Mot de passe (8 caractères minimum)</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-block" disabled={loading}>
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>

      <p style={{ marginTop: '1.5rem' }}>
        Déjà inscrit ? <Link href="/login">Se connecter</Link>
      </p>
    </main>
  );
}
