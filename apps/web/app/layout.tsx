import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CookieConsent } from '@/components/CookieConsent';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Sentinelle — Découvrir et soutenir le patrimoine',
    template: '%s | Sentinelle',
  },
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
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
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

        <div id="contenu">{children}</div>

        <footer className="site-footer">
          <nav aria-label="Liens de bas de page">
            <Link href="/comment-ca-marche">Comment ça marche</Link>
            <Link href="/confidentialite">Confidentialité (RGPD)</Link>
            <Link href="/mentions-legales">Mentions légales</Link>
          </nav>
          <p className="muted">
            Sentinelle finance et documente la restauration du patrimoine ; elle
            n'autorise aucun travaux. Hébergement en Union européenne.
          </p>
        </footer>

        <CookieConsent />
      </body>
    </html>
  );
}
