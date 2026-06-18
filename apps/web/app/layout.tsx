import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sentinelle — Découvrir et soutenir le patrimoine',
  description:
    'Découvrez un lieu de patrimoine sur une carte, comprenez son besoin de restauration et faites un don en toute confiance.',
};

// Mobile-first (SPEC §7) : viewport adapté smartphone.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <html lang="fr">
      <body>
        <header className="site-header">
          <nav aria-label="Navigation principale">
            <Link href="/" className="brand">
              Sentinelle
            </Link>
            <Link href="/carte">Carte</Link>
            <Link href="/espace-porteur">Espace porteur</Link>
            <span className="spacer" />
            <Link href="/login">Connexion</Link>
            <Link href="/account">Mon compte</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
