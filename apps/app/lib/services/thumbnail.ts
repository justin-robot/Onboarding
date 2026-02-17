import sharp from "sharp";
import {
  getStorageConfig,
  uploadFile,
  getPresignedDownloadUrl,
} from "@repo/storage";
import { fileService } from "./file";

// Thumbnail dimensions
const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 200;

// Supported image types for thumbnail generation
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/tiff",
];

// PDF mime type
const PDF_MIME_TYPE = "application/pdf";

export interface ThumbnailResult {
  success: boolean;
  thumbnailKey?: string;
  error?: string;
}

/**
 * Generate a thumbnail key from the original storage key
 */
function generateThumbnailKey(originalKey: string): string {
  // Insert /thumbnails/ before the filename
  const parts = originalKey.split("/");
  const filename = parts.pop()!;
  const basePath = parts.join("/");

  // Add thumb- prefix and change extension to .webp for consistency
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
  return `${basePath}/thumbnails/thumb-${nameWithoutExt}.webp`;
}

/**
 * Check if a mime type supports thumbnail generation
 */
export function supportsThumbnail(mimeType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType) || mimeType === PDF_MIME_TYPE;
}

/**
 * Generate thumbnail for an image
 */
async function generateImageThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
      fit: "cover",
      position: "center",
    })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * Generate thumbnail from first page of PDF
 * Note: This requires sharp to be built with PDF support via libvips
 * If PDF support is not available, this will throw an error
 */
async function generatePdfThumbnail(pdfBuffer: Buffer): Promise<Buffer> {
  // Sharp can render PDF first page if libvips was built with poppler support
  // We use page 0 (first page) and density 72 for reasonable quality
  return sharp(pdfBuffer, {
    page: 0,
    density: 72,
  })
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
      fit: "cover",
      position: "north", // Top of the page is usually most relevant
    })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * Fetch file content from storage
 */
async function fetchFileFromStorage(storageKey: string): Promise<Buffer> {
  const config = getStorageConfig();
  const downloadUrl = await getPresignedDownloadUrl(config, storageKey, 300);

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export const thumbnailService = {
  /**
   * Generate and upload a thumbnail for a file
   * This is designed to be called asynchronously after file upload confirmation
   */
  async generateThumbnail(
    fileId: string,
    storageKey: string,
    mimeType: string
  ): Promise<ThumbnailResult> {
    // Check if this file type supports thumbnails
    if (!supportsThumbnail(mimeType)) {
      return {
        success: false,
        error: `Unsupported mime type for thumbnail: ${mimeType}`,
      };
    }

    try {
      // Fetch the original file from storage
      const fileBuffer = await fetchFileFromStorage(storageKey);

      // Generate thumbnail based on file type
      let thumbnailBuffer: Buffer;

      if (mimeType === PDF_MIME_TYPE) {
        thumbnailBuffer = await generatePdfThumbnail(fileBuffer);
      } else {
        thumbnailBuffer = await generateImageThumbnail(fileBuffer);
      }

      // Generate thumbnail key
      const thumbnailKey = generateThumbnailKey(storageKey);

      // Upload thumbnail to storage
      const config = getStorageConfig();
      await uploadFile(config, thumbnailKey, thumbnailBuffer, {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000", // 1 year cache
      });

      // Update the file record with thumbnail key
      await fileService.updateThumbnailKey(fileId, thumbnailKey);

      return {
        success: true,
        thumbnailKey,
      };
    } catch (error) {
      // Handle failures gracefully - file is still valid without thumbnail
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`Thumbnail generation failed for file ${fileId}:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Generate thumbnails for multiple files (batch processing)
   */
  async generateThumbnailsBatch(
    files: Array<{ id: string; storageKey: string; mimeType: string }>
  ): Promise<Map<string, ThumbnailResult>> {
    const results = new Map<string, ThumbnailResult>();

    // Process in parallel with concurrency limit
    const concurrencyLimit = 5;
    const chunks: typeof files[] = [];

    for (let i = 0; i < files.length; i += concurrencyLimit) {
      chunks.push(files.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((file) =>
          this.generateThumbnail(file.id, file.storageKey, file.mimeType)
            .then((result) => ({ id: file.id, result }))
        )
      );

      for (const { id, result } of chunkResults) {
        results.set(id, result);
      }
    }

    return results;
  },
};
