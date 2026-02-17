import { taskService, configService, signNowService, sectionService, type NotificationContext } from "@/lib/services";
import type { ESignConfig } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";
import { notificationService } from "@repo/notifications";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tasks/[id]/signing-url - Get or generate a signing URL for an e-sign task
 *
 * Returns: { signingUrl: string }
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

    // If signing URL already exists and status is sent or beyond, return it
    if (esignConfig.providerSigningUrl && esignConfig.status !== "pending") {
      return json({ signingUrl: esignConfig.providerSigningUrl });
    }

    // Check if SignNow is configured
    if (!signNowService.isConfigured()) {
      return errorResponse(
        "E-signing service is not configured. Please contact support.",
        503
      );
    }

    // Verify we have required fields
    if (!esignConfig.fileId) {
      return errorResponse("No document configured for signing", 400);
    }
    if (!esignConfig.signerEmail) {
      return errorResponse("No signer email configured", 400);
    }

    // Get workspace for audit context
    const section = await sectionService.getById(task.sectionId);
    if (!section) {
      return errorResponse("Section not found", 404);
    }

    // Create notification context
    const notificationContext: NotificationContext = {
      triggerWorkflow: async (options) => {
        return notificationService.triggerWorkflow({
          workflowId: options.workflowId as Parameters<typeof notificationService.triggerWorkflow>[0]["workflowId"],
          recipientId: options.recipientId,
          data: options.data as Parameters<typeof notificationService.triggerWorkflow>[0]["data"],
          tenant: options.tenant,
        });
      },
    };

    // Push document to SignNow and update config
    const updatedConfig = await signNowService.pushAndUpdateConfig(
      esignConfig.id,
      esignConfig.fileId,
      esignConfig.signerEmail,
      {
        workspaceId: section.workspaceId,
        actorId: user.id,
        taskId,
      },
      notificationContext
    );

    if (!updatedConfig?.providerSigningUrl) {
      return errorResponse("Failed to generate signing URL", 500);
    }

    return json({ signingUrl: updatedConfig.providerSigningUrl });
  });
}
