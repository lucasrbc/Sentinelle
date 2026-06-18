import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales et informations de conformité de Sentinelle.',
};

export default function LegalPage(): React.JSX.Element {
  return (
    <main className="container">
      <h1>Mentions légales</h1>
      <p>
        Sentinelle — plateforme de découverte et de financement du patrimoine
        (MVP, région pilote : Bretagne).
      </p>
      <h2>Éditeur</h2>
      <p>À compléter (raison sociale, adresse, contact, directeur de publication).</p>
      <h2>Hébergement</h2>
      <p>Hébergement en Union européenne (à préciser : prestataire, adresse).</p>
      <h2>Responsabilité éditoriale &amp; signalement</h2>
      <p>
        Les contenus produits par la plateforme relèvent de sa responsabilité
        éditoriale. Les contenus fournis par des tiers (porteurs de projets)
        relèvent du régime de l'hébergeur ; tout contenu illicite peut être
        signalé à l'adresse de contact ci-dessus.
      </p>
    </main>
  );
}
