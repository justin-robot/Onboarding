/**
 * Storage provider interface - platform agnostic
 */
export type StorageProvider = "s3" | "r2" | "custom";

export type UploadOptions = {
  /** Content type of the file */
  contentType?: string;
  /** Custom metadata */
  metadata?: Record<string, string>;
  /** Public read access */
  public?: boolean;
  /** Cache control header */
  cacheControl?: string;
};

export type UploadResult = {
  /** URL to access the uploaded file */
  url: string;
  /** Key/path of the uploaded file */
  key: string;
  /** File size in bytes */
  size: number;
  /** Content type */
  contentType: string;
};

export type PresignedUrlOptions = {
  /** Expiration time in seconds (default: 3600) */
  expiresIn?: number;
  /** Content type for upload */
  contentType?: string;
  /** Additional headers */
  headers?: Record<string, string>;
};

export type StorageConfig = {
  provider: StorageProvider;
  region?: string;
  bucket: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicUrl?: string;
};

