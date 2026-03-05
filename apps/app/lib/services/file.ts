import { database } from "@repo/database";
import {
  getStorageConfig,
  getPresignedUploadUrl as getPresignedUrl,
  getPresignedDownloadUrl,
  deleteFile,
  getFileUrl,
} from "@repo/storage";
import type { File, NewFile, FileSourceType } from "@repo/database";

// Dynamically import ably to avoid bundling issues with Next.js
const ABLY_PATH = "./ably";
async function getAblyService() {
  if (typeof window !== "undefined") return null;
  try {
    const module = await import(/* webpackIgnore: true */ ABLY_PATH);
    return { ablyService: module.ablyService, WORKSPACE_EVENTS: module.WORKSPACE_EVENTS };
  } catch {
    return null;
  }
}

// Result for presigned URL generation
export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

// Options for confirming an upload
export interface ConfirmUploadOptions {
  key: string;
  workspaceId: string;
  uploadedBy: string;
  name: string;
  mimeType: string;
  size: number;
  sourceType: FileSourceType;
  sourceTaskId?: string | null;
  /** If true, triggers async thumbnail generation for supported file types */
  generateThumbnail?: boolean;
}

// File with download URL
export interface FileWithUrl extends File {
  downloadUrl?: string;
}

/**
 * Generate a unique storage key for a file
 * Format: workspaceId/year/month/uuid-filename
 */
function generateStorageKey(workspaceId: string, filename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const uuid = crypto.randomUUID();

  // Sanitize filename - keep extension, remove special chars
  const sanitizedName = filename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase();

  return `${workspaceId}/${year}/${month}/${uuid}-${sanitizedName}`;
}

export const fileService = {
  /**
   * Get a presigned URL for uploading a file
   * Returns the URL and the storage key to use for confirmation
   */
  async getPresignedUploadUrl(
    workspaceId: string,
    filename: string,
    mimeType: string,
    expiresIn = 3600
  ): Promise<PresignedUploadResult> {
    const config = getStorageConfig();
    const key = generateStorageKey(workspaceId, filename);

    const uploadUrl = await getPresignedUrl(config, key, {
      contentType: mimeType,
      expiresIn,
    });

    return {
      uploadUrl,
      key,
      expiresIn,
    };
  },

  /**
   * Confirm an upload and create a File record
   * Call this after the client has uploaded to the presigned URL
   * If generateThumbnail is true, triggers async thumbnail generation
   */
  async confirmUpload(options: ConfirmUploadOptions): Promise<File> {
    const file = await database
      .insertInto("file")
      .values({
        workspaceId: options.workspaceId,
        uploadedBy: options.uploadedBy,
        name: options.name,
        mimeType: options.mimeType,
        size: options.size,
        storageKey: options.key,
        thumbnailKey: null,
        sourceType: options.sourceType,
        sourceTaskId: options.sourceTaskId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Trigger async thumbnail generation if requested
    if (options.generateThumbnail) {
      // Import dynamically to avoid circular dependency
      import("./thumbnail").then(({ thumbnailService }) => {
        thumbnailService.generateThumbnail(file.id, file.storageKey, file.mimeType)
          .catch((err) => {
            console.error(`Async thumbnail generation failed for file ${file.id}:`, err);
          });
      });
    }

    // Broadcast file uploaded event (fire and forget)
    getAblyService().then((ably) => {
      if (ably) {
        ably.ablyService.broadcastToWorkspace(
          options.workspaceId,
          ably.WORKSPACE_EVENTS.FILE_UPLOADED,
          {
            fileId: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            sourceType: file.sourceType,
            sourceTaskId: file.sourceTaskId,
            uploadedBy: file.uploadedBy,
          }
        ).catch((err: unknown) => console.error("Failed to broadcast file uploaded:", err));
      }
    });

    return file;
  },

  /**
   * Get a file by ID
   */
  async getById(id: string): Promise<File | null> {
    const file = await database
      .selectFrom("file")
      .selectAll()
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    return file ?? null;
  },

  /**
   * Get a file by ID with a presigned download URL
   */
  async getByIdWithUrl(id: string, expiresIn = 3600): Promise<FileWithUrl | null> {
    const file = await this.getById(id);
    if (!file) return null;

    const config = getStorageConfig();
    const downloadUrl = await getPresignedDownloadUrl(config, file.storageKey, expiresIn);

    return { ...file, downloadUrl };
  },

  /**
   * Get all files for a workspace
   */
  async getByWorkspaceId(workspaceId: string): Promise<File[]> {
    return database
      .selectFrom("file")
      .selectAll()
      .where("workspaceId", "=", workspaceId)
      .where("deletedAt", "is", null)
      .orderBy("createdAt", "desc")
      .execute();
  },

  /**
   * Get all files for a task (e.g., file request uploads)
   */
  async getByTaskId(taskId: string): Promise<File[]> {
    return database
      .selectFrom("file")
      .selectAll()
      .where("sourceTaskId", "=", taskId)
      .where("deletedAt", "is", null)
      .orderBy("createdAt", "desc")
      .execute();
  },

  /**
   * Get public URL for a file (if storage supports it)
   */
  getPublicUrl(storageKey: string): string {
    const config = getStorageConfig();
    return getFileUrl(config, storageKey);
  },

  /**
   * Update thumbnail key after thumbnail generation
   */
  async updateThumbnailKey(id: string, thumbnailKey: string): Promise<File | null> {
    const file = await database
      .updateTable("file")
      .set({
        thumbnailKey,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();

    return file ?? null;
  },

  /**
   * Soft delete a file
   */
  async delete(id: string): Promise<boolean> {
    // Get file info before deleting for broadcast
    const file = await this.getById(id);

    const result = await database
      .updateTable("file")
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    const deleted = (result.numUpdatedRows ?? 0n) > 0n;

    // Broadcast file deleted event (fire and forget)
    if (deleted && file) {
      getAblyService().then((ably) => {
        if (ably) {
          ably.ablyService.broadcastToWorkspace(
            file.workspaceId,
            ably.WORKSPACE_EVENTS.FILE_DELETED,
            {
              fileId: id,
              sourceTaskId: file.sourceTaskId,
            }
          ).catch((err: unknown) => console.error("Failed to broadcast file deleted:", err));
        }
      });
    }

    return deleted;
  },

  /**
   * Hard delete a file (remove from storage too)
   */
  async hardDelete(id: string): Promise<boolean> {
    const file = await this.getById(id);
    if (!file) return false;

    const config = getStorageConfig();

    // Delete from storage
    await deleteFile(config, file.storageKey);

    // Delete thumbnail if exists
    if (file.thumbnailKey) {
      await deleteFile(config, file.thumbnailKey);
    }

    // Delete from database
    const result = await database
      .deleteFrom("file")
      .where("id", "=", id)
      .executeTakeFirst();

    return (result.numDeletedRows ?? 0n) > 0n;
  },

  /**
   * Replace a file with a new version
   * Creates a new file record with previousVersionId pointing to the old file
   */
  async replaceFile(
    fileId: string,
    newStorageKey: string,
    options: {
      uploadedBy: string;
      name: string;
      mimeType: string;
      size: number;
      generateThumbnail?: boolean;
    }
  ): Promise<File | null> {
    // Get the existing file
    const existingFile = await this.getById(fileId);
    if (!existingFile) {
      return null;
    }

    // Create new file version with reference to the previous version
    const newFile = await database
      .insertInto("file")
      .values({
        workspaceId: existingFile.workspaceId,
        uploadedBy: options.uploadedBy,
        name: options.name,
        mimeType: options.mimeType,
        size: options.size,
        storageKey: newStorageKey,
        thumbnailKey: null,
        sourceType: existingFile.sourceType,
        sourceTaskId: existingFile.sourceTaskId,
        previousVersionId: existingFile.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Trigger async thumbnail generation if requested
    if (options.generateThumbnail) {
      import("./thumbnail").then(({ thumbnailService }) => {
        thumbnailService.generateThumbnail(newFile.id, newFile.storageKey, newFile.mimeType)
          .catch((err) => {
            console.error(`Async thumbnail generation failed for file ${newFile.id}:`, err);
          });
      });
    }

    return newFile;
  },

  /**
   * Get the version history of a file by walking the previousVersionId chain
   * Returns array ordered from newest to oldest
   */
  async getVersionHistory(fileId: string): Promise<File[]> {
    const history: File[] = [];
    let currentId: string | null = fileId;

    // Walk the chain, limiting to prevent infinite loops
    const maxVersions = 100;
    let count = 0;

    while (currentId && count < maxVersions) {
      const file = await database
        .selectFrom("file")
        .selectAll()
        .where("id", "=", currentId)
        .executeTakeFirst();

      if (!file) break;

      history.push(file);
      currentId = file.previousVersionId;
      count++;
    }

    return history;
  },

  /**
   * Get the latest version of a file
   * Finds all files that have this file in their version chain and returns the newest
   */
  async getLatestVersion(fileId: string): Promise<File | null> {
    // Find files that reference this file as their previous version
    let currentFile = await this.getById(fileId);
    if (!currentFile) return null;

    // Keep looking for newer versions until we find one with no successors
    const maxIterations = 100;
    let iterations = 0;

    while (iterations < maxIterations) {
      const newerVersion = await database
        .selectFrom("file")
        .selectAll()
        .where("previousVersionId", "=", currentFile.id)
        .where("deletedAt", "is", null)
        .executeTakeFirst();

      if (!newerVersion) {
        // No newer version found, current is the latest
        return currentFile;
      }

      currentFile = newerVersion;
      iterations++;
    }

    return currentFile;
  },

  /**
   * Get the original (oldest) version of a file
   */
  async getOriginalVersion(fileId: string): Promise<File | null> {
    const history = await this.getVersionHistory(fileId);
    return history.length > 0 ? history[history.length - 1] : null;
  },

  /**
   * Count how many versions a file has
   */
  async getVersionCount(fileId: string): Promise<number> {
    const history = await this.getVersionHistory(fileId);
    return history.length;
  },
};
