/** Résumé d'un lieu (carte / recherche). */
export interface SiteSummary {
  id: string;
  slug: string;
  name: string;
  type: string;
  commune: string | null;
  department: string | null;
  protectionStatus: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

export interface SiteProject {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  urgencyLevel: string | null;
  targetAmount: number;
  collectedAmount: number;
  quoteUrl: string | null;
}

/** Détail complet d'un lieu (fiche). */
export interface SiteDetail {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  commune: string | null;
  department: string | null;
  protectionStatus: string;
  conservationState: string | null;
  photos: string[];
  latitude: number | null;
  longitude: number | null;
  project: SiteProject | null;
}

/** Projet vu par son porteur / l'admin (tous statuts). */
export interface OwnerProject {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  urgencyLevel: string | null;
  targetAmount: number;
  collectedAmount: number;
  quoteUrl: string | null;
  heritageSiteId: string;
  organizationId: string;
}

export interface ProjectUpdate {
  id: string;
  title: string;
  body: string;
  imageUrls: string[];
  createdAt: string;
}

/** Filtres de la carte / recherche. */
export interface SiteFilters {
  type: string[];
  protectionStatus: string[];
  urgency: string[];
  onlyWithActiveCollection: boolean;
}
