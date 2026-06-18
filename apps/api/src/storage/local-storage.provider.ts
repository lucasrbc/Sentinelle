import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageProvider, StoredFile } from './storage.types';

/**
 * Stockage local sur disque (développement). Les fichiers sont écrits sous
 * UPLOADS_DIR et servis en statique sous /uploads (cf. main.ts).
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly dir: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    this.dir = resolve(config.get<string>('UPLOADS_DIR') ?? 'uploads');
    this.publicBaseUrl = (
      config.get<string>('PUBLIC_BASE_URL') ?? 'http://localhost:4000'
    ).replace(/\/$/, '');
  }

  // contentType non utilisé en stockage local (le fichier est servi tel quel).
  async save(key: string, body: Buffer): Promise<StoredFile> {
    const target = join(this.dir, key);
    // Crée l'arborescence complète (la clé peut contenir des sous-dossiers, ex. quotes/).
    await fs.mkdir(dirname(target), { recursive: true });
    await fs.writeFile(target, body);
    return { key, url: `${this.publicBaseUrl}/uploads/${key}` };
  }
}
