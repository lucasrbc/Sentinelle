import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Confidentialité & RGPD',
  description:
    'Données personnelles, finalités, durées de conservation et droits (accès, effacement) sur Sentinelle.',
};

export default function PrivacyPage(): React.JSX.Element {
  return (
    <main className="container">
      <h1>Confidentialité &amp; protection des données (RGPD)</h1>

      <h2>Données collectées et finalités</h2>
      <ul>
        <li>
          <strong>Compte</strong> (email, nom, rôle) : authentification et gestion
          du compte. La connexion est assurée par un prestataire hébergé en UE ;
          nous ne stockons pas votre mot de passe.
        </li>
        <li>
          <strong>Dons</strong> (montant, email, reçu) : traitement du don,
          émission du reçu fiscal, transparence du projet.
        </li>
        <li>
          <strong>Géolocalisation</strong> (« autour de moi ») : utilisée
          uniquement, sur votre demande explicite, pour centrer la carte. Elle
          n'est ni enregistrée ni partagée.
        </li>
        <li>
          <strong>Cookies</strong> : strictement nécessaires (session). Aucun
          traceur publicitaire.
        </li>
      </ul>

      <h2>Hébergement</h2>
      <p>Données hébergées en Union européenne.</p>

      <h2>Conservation</h2>
      <p>
        Les données de compte sont conservées tant que le compte existe. Les
        données comptables liées aux dons (reçus) sont conservées conformément aux
        obligations légales.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d'un droit d'accès, de rectification et d'effacement. Vous
        pouvez <strong>supprimer votre compte</strong> directement depuis la page
        « Mon compte » (droit à l'effacement).
      </p>
    </main>
  );
}
