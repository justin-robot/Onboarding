import { taskService, configService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tasks/[id]/config - Create or update task config
 * Used for task types that require additional setup (TIME_BOOKING, E_SIGN)
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id: taskId } = await params;
    const body = await request.json();

    // Get task to verify it exists and get its type
    const task = await taskService.getById(taskId);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    switch (task.type) {
      case "TIME_BOOKING": {
        if (!body.bookingLink || typeof body.bookingLink !== "string") {
          return errorResponse("Booking link is required");
        }

        // Check if config exists
        const existingConfig = await configService.getTimeBookingConfigByTaskId(taskId);

        if (existingConfig) {
          // Update existing config
          const updated = await configService.updateTimeBookingConfig(existingConfig.id, {
            bookingLink: body.bookingLink,
          });
          return json(updated);
        } else {
          // Create new config
          const config = await configService.createTimeBookingConfig(taskId, {
            bookingLink: body.bookingLink,
          });
          return json(config, 201);
        }
      }

      case "E_SIGN": {
        if (!body.fileId || typeof body.fileId !== "string") {
          return errorResponse("File ID is required");
        }
        if (!body.signerEmail || typeof body.signerEmail !== "string") {
          return errorResponse("Signer email is required");
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.signerEmail)) {
          return errorResponse("Invalid email format");
        }

        // Check if config exists
        const existingConfig = await configService.getESignConfigByTaskId(taskId);

        if (existingConfig) {
          // Update existing config
          const updated = await configService.updateESignConfig(existingConfig.id, {
            fileId: body.fileId,
            signerEmail: body.signerEmail,
          });
          return json(updated);
        } else {
          // Create new config
          const config = await configService.createESignConfig(taskId, {
            fileId: body.fileId,
            signerEmail: body.signerEmail,
          });
          return json(config, 201);
        }
      }

      case "ACKNOWLEDGEMENT": {
        // Check if config exists
        const existingConfig = await configService.getAcknowledgementConfigByTaskId(taskId);

        if (existingConfig) {
          // Update existing config
          const updated = await configService.updateAcknowledgementConfig(existingConfig.id, {
            instructions: body.instructions || null,
          });
          return json(updated);
        } else {
          // Create new config
          const config = await configService.createAcknowledgementConfig(taskId, {
            instructions: body.instructions,
          });
          return json(config, 201);
        }
      }

      case "FILE_REQUEST": {
        // Check if config exists
        const existingConfig = await configService.getFileRequestConfigByTaskId(taskId);

        if (existingConfig) {
          // Update existing config
          const updated = await configService.updateFileRequestConfig(existingConfig.id, {
            targetFolderId: body.targetFolderId || null,
          });
          return json(updated);
        } else {
          // Create new config
          const config = await configService.createFileRequestConfig(taskId, {
            targetFolderId: body.targetFolderId,
          });
          return json(config, 201);
        }
      }

      default:
        return errorResponse(`Config cannot be created for task type: ${task.type}`);
    }
  });
}
