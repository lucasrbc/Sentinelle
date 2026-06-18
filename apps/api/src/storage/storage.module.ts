import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import { STORAGE_PROVIDER, type StorageProvider } from './storage.types';

/** Choisit le stockage selon STORAGE_PROVIDER (`local` par défaut, `s3` en prod). */
const storageFactory = {
  provide: STORAGE_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): StorageProvider => {
    const kind = (config.get<string>('STORAGE_PROVIDER') ?? 'local').toLowerCase();
    return kind === 's3'
      ? new S3StorageProvider(config)
      : new LocalStorageProvider(config);
  },
};

@Global()
@Module({
  providers: [storageFactory],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
