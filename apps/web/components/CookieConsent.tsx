'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'sentinelle-cookie-consent';

/**
 * Bannière d'information cookies (RGPD). Sentinelle n'utilise que des cookies
 * strictement nécessaires (session de connexion) ; aucun traceur publicitaire.
 * Le choix est mémorisé localement.
 */
export function CookieConsent(): React.JSX.Element | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage indisponible : on n'affiche pas la bannière.
    }
  }, []);

  if (!visible) return null;

  function accept(): void {
    try {
      localStorage.setItem(STORAGE_KEY, 'ok');
    } catch {
      // ignore
    }
    setVisible(false);
  }

  return (
    <div className="cookie-banner" role="dialog" aria-label="Information cookies">
      <p>
        Nous utilisons uniquement des cookies <strong>strictement nécessaires</strong>{' '}
        au fonctionnement (connexion). Aucun traceur publicitaire.{' '}
        <Link href="/confidentialite">En savoir plus</Link>.
      </p>
      <button type="button" className="btn" onClick={accept}>
        J'ai compris
      </button>
    </div>
  );
}
