/** Formate un montant en CENTIMES vers une chaîne en euros (ex. 125000 → « 1 250 € »). */
export function formatEuros(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Pourcentage d'avancement d'une collecte (borné 0–100). */
export function collectedPercent(collected: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((collected / target) * 100));
}

const HERITAGE_TYPE_LABELS: Record<string, string> = {
  CHURCH: 'Église',
  CHAPEL: 'Chapelle',
  CALVARY: 'Calvaire',
  PARISH_CLOSE: 'Enclos paroissial',
  OSSUARY: 'Ossuaire',
  ABBEY: 'Abbaye',
  MANOR: 'Manoir',
  WASHHOUSE: 'Lavoir',
  OTHER: 'Autre',
};

export function heritageTypeLabel(type: string): string {
  return HERITAGE_TYPE_LABELS[type] ?? type;
}

const PROTECTION_LABELS: Record<string, string> = {
  NONE: 'Non protégé',
  INSCRIT: 'Inscrit aux Monuments Historiques',
  CLASSE: 'Classé Monument Historique',
};

export function protectionLabel(status: string): string {
  return PROTECTION_LABELS[status] ?? status;
}

const URGENCY_LABELS: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Modérée',
  HIGH: 'Élevée',
  CRITICAL: 'Critique',
};

export function urgencyLabel(level: string): string {
  return URGENCY_LABELS[level] ?? level;
}
