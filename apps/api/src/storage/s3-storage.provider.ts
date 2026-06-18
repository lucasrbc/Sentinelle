import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageProvider, StoredFile } from './storage.types';

/**
 * Stockage S3-compatible (production), hébergé en UE (OVH / Scaleway…).
 * Activé via STORAGE_PROVIDER=s3.
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>('S3_ENDPOINT');
    const region = config.get<string>('S3_REGION') ?? 'eu-west-1';
    const accessKeyId = config.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('S3_SECRET_ACCESS_KEY');
    const bucket = config.get<string>('S3_BUCKET');

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'STORAGE_PROVIDER=s3 requiert S3_BUCKET, S3_ACCESS_KEY_ID et S3_SECRET_ACCESS_KEY.',
      );
    }

    this.bucket = bucket;
    this.publicBaseUrl = (
      config.get<string>('S3_PUBLIC_URL') ??
      `${endpoint?.replace(/\/$/, '')}/${bucket}`
    ).replace(/\/$/, '');

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async save(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<StoredFile> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return { key, url: `${this.publicBaseUrl}/${key}` };
  }
}
