import { NextResponse } from "next/server";
import { workspaceService } from "@/lib/services/workspace";
import { verifyCronSecret } from "../../_lib/cron-auth";

const RETENTION_DAYS = 30;

/**
 * GET /api/cron/workspace-cleanup
 *
 * Automatically hard-deletes workspaces that have been soft-deleted
 * for more than 30 days. Should be run daily.
 */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get workspaces soft-deleted more than 30 days ago
    const workspacesToDelete = await workspaceService.listSoftDeletedForCleanup(RETENTION_DAYS);

    if (workspacesToDelete.length === 0) {
      console.log("[cron/workspace-cleanup] No workspaces to clean up");
      return NextResponse.json({
        success: true,
        deleted: 0,
        errors: [],
      });
    }

    console.log(`[cron/workspace-cleanup] Found ${workspacesToDelete.length} workspaces to delete`);

    const results: Array<{ id: string; name: string; success: boolean; error?: string }> = [];
    const allFileKeys: string[] = [];

    // Hard delete each workspace
    for (const workspace of workspacesToDelete) {
      const result = await workspaceService.hardDelete(workspace.id);

      if (result.success) {
        results.push({ id: workspace.id, name: workspace.name, success: true });
        if (result.deletedFileKeys) {
          allFileKeys.push(...result.deletedFileKeys);
        }
        console.log(`[cron/workspace-cleanup] Deleted workspace: ${workspace.name} (${workspace.id})`);
      } else {
        results.push({ id: workspace.id, name: workspace.name, success: false, error: result.error });
        console.error(`[cron/workspace-cleanup] Failed to delete workspace ${workspace.id}: ${result.error}`);
      }
    }

    // Async S3 cleanup - lazy load storage to avoid cold start issues
    if (allFileKeys.length > 0) {
      import("@repo/storage")
        .then(({ deleteFile, getStorageConfig }) => {
          const config = getStorageConfig();
          console.log(`[cron/workspace-cleanup] Cleaning up ${allFileKeys.length} S3 files`);

          Promise.all(
            allFileKeys.map((key) =>
              deleteFile(config, key).catch((err: Error) => {
                console.error(`[cron/workspace-cleanup] Failed to delete S3 file ${key}:`, err.message);
              })
            )
          ).then(() => {
            console.log("[cron/workspace-cleanup] S3 cleanup completed");
          });
        })
        .catch((err: Error) => {
          console.error("[cron/workspace-cleanup] Failed to load storage module:", err.message);
        });
    }

    const successCount = results.filter((r) => r.success).length;
    const errors = results.filter((r) => !r.success);

    console.log(`[cron/workspace-cleanup] Completed: ${successCount} deleted, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      deleted: successCount,
      filesQueued: allFileKeys.length,
      errors: errors.map((e) => ({ id: e.id, name: e.name, error: e.error })),
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
