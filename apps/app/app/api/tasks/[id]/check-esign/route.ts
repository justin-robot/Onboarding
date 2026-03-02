import { taskService, configService, signNowService } from "@/lib/services";
import { database } from "@repo/database";
import type { ESignConfig } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tasks/[id]/check-esign - Check e-sign status and update task if completed
 *
 * For local development where webhooks can't reach localhost.
 * Call this after signing to update the task status.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: taskId } = await params;

    // Get the task
    const task = await taskService.getById(taskId);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    // Verify it's an e-sign task
    if (task.type !== "E_SIGN") {
      return errorResponse("Task is not an e-sign task", 400);
    }

    // Get the e-sign config
    const config = await configService.getConfigByTaskId(taskId, "E_SIGN");
    if (!config) {
      return errorResponse("E-sign configuration not found", 404);
    }

    const esignConfig = config as ESignConfig;

    // Check if we have a document ID
    if (!esignConfig.providerDocumentId) {
      return errorResponse("Document not yet sent to SignNow", 400);
    }

    // Already completed?
    if (esignConfig.status === "completed") {
      return json({
        status: "completed",
        message: "Document already completed",
        taskCompleted: task.status === "completed"
      });
    }

    // Check status from SignNow
    if (!signNowService.isConfigured()) {
      return errorResponse("SignNow not configured", 503);
    }

    const docStatus = await signNowService.getDocumentStatus(esignConfig.providerDocumentId);
    console.log("[check-esign] Document status:", docStatus);

    if (docStatus.isComplete) {
      // Get signed document URL
      const completedDocumentUrl = await signNowService.getSignedDocumentUrl(
        esignConfig.providerDocumentId
      );

      // Update e-sign config
      await database
        .updateTable("esign_config")
        .set({
          status: "completed",
          completedDocumentUrl,
          updatedAt: new Date(),
        })
        .where("id", "=", esignConfig.id)
        .execute();

      // Mark task as complete
      const { completionService } = await import("@/lib/services/completion");
      await completionService.completeTaskSystem(taskId);

      return json({
        status: "completed",
        message: "Document signed and task completed!",
        completedDocumentUrl,
        taskCompleted: true
      });
    }

    return json({
      status: docStatus.status,
      message: `Document status: ${docStatus.status}`,
      isComplete: docStatus.isComplete,
      taskCompleted: task.status === "completed"
    });
  });
}
