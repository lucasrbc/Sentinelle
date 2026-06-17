import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

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
      <body>{children}</body>
    </html>
  );
}
