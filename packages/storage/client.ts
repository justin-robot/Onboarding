import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  StorageConfig,
  StorageProvider,
  UploadOptions,
  UploadResult,
  PresignedUrlOptions,
} from "./types";

/**
 * Get storage client based on provider
 */
export const createStorageClient = (config: StorageConfig): S3Client => {
  const isR2 = config.provider === "r2";
  const isCustom = config.provider === "custom";

  const clientConfig = {
    region: config.region || "auto",
    credentials: config.accessKeyId && config.secretAccessKey
      ? {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        }
      : undefined,
  };

  // R2 and custom providers need custom endpoint
  if (isR2 || isCustom) {
    if (!config.endpoint) {
      throw new Error(`${config.provider} requires an endpoint`);
    }
    return new S3Client({
      ...clientConfig,
      endpoint: config.endpoint,
      forcePathStyle: true,
    });
  }

  // Standard S3
  return new S3Client(clientConfig);
};

/**
 * Upload a file to storage
 */
export const uploadFile = async (
  config: StorageConfig,
  key: string,
  body: Buffer | Uint8Array | string,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  const client = createStorageClient(config);

  const params: PutObjectCommandInput = {
    Bucket: config.bucket,
    Key: key,
    Body: body,
    ContentType: options.contentType,
    Metadata: options.metadata,
    CacheControl: options.cacheControl,
  };

  if (options.public) {
    params.ACL = "public-read";
  }

  const command = new PutObjectCommand(params);
  await client.send(command);

  const size = typeof body === "string" ? Buffer.byteLength(body) : body.length;
  const url = getFileUrl(config, key);

  return {
    url,
    key,
    size,
    contentType: options.contentType || "application/octet-stream",
  };
};

/**
 * Delete a file from storage
 */
export const deleteFile = async (
  config: StorageConfig,
  key: string
): Promise<void> => {
  const client = createStorageClient(config);

  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  await client.send(command);
};

/**
 * Get a presigned URL for uploading
 */
export const getPresignedUploadUrl = async (
  config: StorageConfig,
  key: string,
  options: PresignedUrlOptions = {}
): Promise<string> => {
  const client = createStorageClient(config);

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: options.contentType,
    Metadata: options.headers,
  });

  return getSignedUrl(client, command, {
    expiresIn: options.expiresIn || 3600,
  });
};

/**
 * Get a presigned URL for downloading
 */
export const getPresignedDownloadUrl = async (
  config: StorageConfig,
  key: string,
  expiresIn = 3600
): Promise<string> => {
  const client = createStorageClient(config);

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
};

/**
 * Get public URL for a file
 */
export const getFileUrl = (config: StorageConfig, key: string): string => {
  if (config.publicUrl) {
    return `${config.publicUrl}/${key}`;
  }

  // Fallback to S3/R2 URL format
  if (config.endpoint) {
    // Custom endpoint (R2 or custom)
    return `${config.endpoint}/${config.bucket}/${key}`;
  }

  // Standard S3 URL
  const region = config.region || "us-east-1";
  return `https://${config.bucket}.s3.${region}.amazonaws.com/${key}`;
};

/**
 * Get storage configuration from environment variables
 */
export const getStorageConfig = (): StorageConfig => {
  const provider = (process.env.STORAGE_PROVIDER || "s3") as StorageProvider;
  const bucket = process.env.STORAGE_BUCKET;

  if (!bucket) {
    throw new Error("STORAGE_BUCKET environment variable is required");
  }

  return {
    provider,
    region: process.env.STORAGE_REGION,
    bucket,
    endpoint: process.env.STORAGE_ENDPOINT,
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
    publicUrl: process.env.STORAGE_PUBLIC_URL,
  };
};

