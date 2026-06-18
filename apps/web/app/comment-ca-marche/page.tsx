import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Comment ça marche / Où va votre argent',
  description:
    'Comment Sentinelle fonctionne, comment vos dons sont utilisés, et pourquoi chaque euro est traçable.',
};

export default function HowItWorksPage(): React.JSX.Element {
  return (
    <main className="container">
      <h1>Comment ça marche</h1>
      <ol>
        <li>
          <strong>Découvrez</strong> un lieu de patrimoine sur la{' '}
          <Link href="/carte">carte</Link>.
        </li>
        <li>
          <strong>Comprenez</strong> son besoin : état, urgence, montant
          nécessaire, devis.
        </li>
        <li>
          <strong>Donnez</strong> en confiance (don ponctuel ou mensuel) et
          suivez l'avancement public.
        </li>
      </ol>

      <h2>Où va votre argent</h2>
      <p>
        Chaque euro est <strong>tracé</strong> et destiné au projet que vous
        soutenez. Les fonds appartiennent au projet porté par une commune ou une
        association <strong>identifiée et vérifiée</strong>, pas à la plateforme.
        Un <strong>reçu fiscal</strong> vous est délivré pour chaque don.
      </p>

      <h2>Confiance &amp; conformité</h2>
      <ul>
        <li>Un projet n'est public qu'après <strong>validation</strong> par notre équipe.</li>
        <li>Aucun don n'est possible sans projet et porteur identifiés.</li>
        <li>
          La plateforme <strong>finance et documente</strong> la restauration ;
          elle n'autorise aucun travaux (les monuments classés relèvent de la
          DRAC / ABF).
        </li>
        <li>Hébergement et stockage en <strong>Union européenne</strong> (RGPD).</li>
      </ul>
    </main>
  );
}
