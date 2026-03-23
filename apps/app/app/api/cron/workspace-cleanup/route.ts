import { NextResponse } from "next/server";
import { workspaceService } from "@/lib/services";
import { deleteFile, getStorageConfig } from "@repo/storage";
import { verifyCronSecret } from "../../_lib/cron-auth";

const RETENTION_DAYS = 30;

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get workspaces eligible for hard delete
    const workspacesToDelete =
      await workspaceService.listSoftDeletedForCleanup(RETENTION_DAYS);

    console.log(
      `[cron/workspace-cleanup] Found ${workspacesToDelete.length} workspaces to clean up`
    );

    const results: Array<{
      id: string;
      name: string;
      success: boolean;
      error?: string;
      filesDeleted?: number;
    }> = [];

    const storageConfig = getStorageConfig();

    for (const workspace of workspacesToDelete) {
      try {
        const result = await workspaceService.hardDelete(workspace.id);

        if (result.success && result.deletedFileKeys) {
          // Clean up S3 files
          await Promise.all(
            result.deletedFileKeys.map((key) =>
              deleteFile(storageConfig, key).catch((err) => {
                console.error(
                  `[cron/workspace-cleanup] Failed to delete file ${key}:`,
                  err
                );
              })
            )
          );
        }

        results.push({
          id: workspace.id,
          name: workspace.name,
          success: result.success,
          error: result.error,
          filesDeleted: result.deletedFileKeys?.length ?? 0,
        });
      } catch (error) {
        console.error(
          `[cron/workspace-cleanup] Error deleting workspace ${workspace.id}:`,
          error
        );
        results.push({
          id: workspace.id,
          name: workspace.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalFilesDeleted = results.reduce(
      (sum, r) => sum + (r.filesDeleted ?? 0),
      0
    );

    console.log(
      `[cron/workspace-cleanup] Completed: ${successCount}/${workspacesToDelete.length} workspaces deleted, ${totalFilesDeleted} files removed`
    );

    return NextResponse.json({
      success: true,
      processed: workspacesToDelete.length,
      deleted: successCount,
      filesDeleted: totalFilesDeleted,
      results,
    });
  } catch (error) {
    console.error("[cron/workspace-cleanup] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
