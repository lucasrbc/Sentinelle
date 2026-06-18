import Link from 'next/link';

export default function HomePage(): React.JSX.Element {
  return (
    <main className="container">
      <h1>Sentinelle</h1>
      <p>
        Découvrir un lieu de patrimoine sur une carte, comprendre son besoin de
        restauration, et faire un don en toute confiance.
      </p>
      <p>
        <Link href="/carte" className="btn">
          Explorer la carte
        </Link>
      </p>
      <p className="muted">
        Région pilote : Bretagne. La carte et les fiches de lieux sont
        accessibles à toutes et tous, sans compte.
      </p>
    </main>
  );
}
