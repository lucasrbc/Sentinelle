/** Jeton d'injection du fournisseur de stockage (couche d'abstraction médias). */
export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface StoredFile {
  /** Clé/chemin de l'objet dans le stockage. */
  key: string;
  /** URL publique d'accès au fichier. */
  url: string;
}

/**
 * Abstraction « stockage d'objets » : permet d'utiliser un disque local en
 * développement et un stockage S3 (région UE) en production sans changer le
 * reste du code.
 */
export interface StorageProvider {
  save(key: string, body: Buffer, contentType: string): Promise<StoredFile>;
}
