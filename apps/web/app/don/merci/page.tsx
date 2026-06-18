'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';

function MerciContent(): React.JSX.Element {
  const params = useSearchParams();
  const donationId = params.get('donation');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!donationId) return;
    // En mode PSP « dev », le paiement est simulé ici (sans effet si non-dev).
    fetch(apiUrl(`/donations/${donationId}/dev-complete`), { method: 'POST' })
      .catch(() => undefined)
      .finally(() => {
        fetch(apiUrl(`/donations/${donationId}/receipt`))
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { pdfUrl?: string } | null) => {
            if (d?.pdfUrl) setReceiptUrl(d.pdfUrl);
          })
          .catch(() => undefined);
      });
  }, [donationId]);

  return (
    <main className="container">
      <h1>Merci pour votre don 🙏</h1>
      <p>
        Votre soutien contribue à préserver le patrimoine. Un reçu fiscal vous
        est adressé.
      </p>
      {receiptUrl ? (
        <p>
          <a className="btn" href={receiptUrl}>
            Télécharger mon reçu fiscal (PDF)
          </a>
        </p>
      ) : (
        <p className="muted">
          Votre reçu sera disponible dès la confirmation du paiement.
        </p>
      )}
      <p>
        <Link href="/carte">Retour à la carte</Link>
      </p>
    </main>
  );
}

export default function MerciPage(): React.JSX.Element {
  return (
    <Suspense fallback={<main className="container">Chargement…</main>}>
      <MerciContent />
    </Suspense>
  );
}
