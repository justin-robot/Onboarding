import { createHmac, timingSafeEqual } from "crypto";
import { database } from "@repo/database";
import { signNowService } from "./signnow";
import { auditLogService } from "./auditLog";
import type { ESignConfig } from "@repo/database";

// SignNow webhook event types
export type SignNowEventType =
  | "document.create"
  | "document.update"
  | "document.delete"
  | "document.complete"
  | "document.sign"
  | "document.fieldinvite.sent"
  | "document.viewed"
  | "document.declined";

// SignNow webhook payload structure
export interface SignNowWebhookPayload {
  event: SignNowEventType;
  timestamp: number;
  data: {
    document_id: string;
    document_name?: string;
    user_id?: string;
    status?: string;
  };
}

// Result of handling a webhook event
export interface WebhookHandlerResult {
  success: boolean;
  event: string;
  documentId: string;
  esignConfigId?: string;
  message?: string;
}

// E-sign config with workspace info
interface ESignConfigWithWorkspace extends ESignConfig {
  workspaceId?: string;
}

/**
 * Verify the SignNow webhook signature
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Helper to get workspaceId from esign config via task
 */
async function getWorkspaceIdForConfig(taskId: string): Promise<string | null> {
  const result = await database
    .selectFrom("task")
    .innerJoin("section", "section.id", "task.sectionId")
    .select("section.workspaceId")
    .where("task.id", "=", taskId)
    .executeTakeFirst();

  return result?.workspaceId ?? null;
}

export const signNowWebhookService = {
  /**
   * Verify webhook signature from SignNow
   */
  verifyWebhook(payload: string, signature: string): boolean {
    const secret = process.env.SIGNNOW_WEBHOOK_SECRET;
    if (!secret) {
      console.warn("SIGNNOW_WEBHOOK_SECRET not configured");
      return false;
    }
    return verifySignature(payload, signature, secret);
  },

  /**
   * Handle an incoming SignNow webhook event
   */
  async handleEvent(payload: SignNowWebhookPayload): Promise<WebhookHandlerResult> {
    const { event, data } = payload;
    const documentId = data.document_id;

    // Find the e-sign config by provider document ID
    const esignConfig = await database
      .selectFrom("esign_config")
      .selectAll()
      .where("providerDocumentId", "=", documentId)
      .executeTakeFirst();

    if (!esignConfig) {
      return {
        success: false,
        event,
        documentId,
        message: `No e-sign config found for document: ${documentId}`,
      };
    }

    // Get workspaceId for audit logging
    const workspaceId = await getWorkspaceIdForConfig(esignConfig.taskId);

    // Handle different event types
    switch (event) {
      case "document.complete":
        return this.handleDocumentComplete(esignConfig, documentId, workspaceId);

      case "document.sign":
        return this.handleDocumentSigned(esignConfig, documentId, workspaceId);

      case "document.viewed":
        return this.handleDocumentViewed(esignConfig, documentId, workspaceId);

      case "document.declined":
        return this.handleDocumentDeclined(esignConfig, documentId, workspaceId);

      default:
        return {
          success: true,
          event,
          documentId,
          esignConfigId: esignConfig.id,
          message: `Unhandled event type: ${event}`,
        };
    }
  },

  /**
   * Handle document.complete event
   * This is the main event for when a document is fully signed
   */
  async handleDocumentComplete(
    esignConfig: ESignConfig,
    documentId: string,
    workspaceId: string | null
  ): Promise<WebhookHandlerResult> {
    try {
      // Get the signed document URL from SignNow
      let completedDocumentUrl: string | null = null;
      if (signNowService.isConfigured()) {
        completedDocumentUrl = await signNowService.getSignedDocumentUrl(documentId);
      }

      // Update e-sign config status
      await database
        .updateTable("esign_config")
        .set({
          status: "completed",
          completedDocumentUrl,
          updatedAt: new Date(),
        })
        .where("id", "=", esignConfig.id)
        .execute();

      // Log audit event
      if (workspaceId) {
        await auditLogService.logEvent({
          workspaceId,
          eventType: "esign.completed",
          actorId: "system",
          taskId: esignConfig.taskId,
          source: "signnow",
          metadata: {
            esignConfigId: esignConfig.id,
            providerDocumentId: documentId,
            completedDocumentUrl,
            signerEmail: esignConfig.signerEmail,
          },
        });
      }

      // Call completion service to mark the task as complete
      const { completionService } = await import("./completion");

      // Get the task to find workspaceId for system completion
      const task = await database
        .selectFrom("task")
        .select(["id", "sectionId"])
        .where("id", "=", esignConfig.taskId)
        .executeTakeFirst();

      if (task) {
        // Use system completion since this is triggered by webhook
        await completionService.completeTaskSystem(task.id);
      }

      return {
        success: true,
        event: "document.complete",
        documentId,
        esignConfigId: esignConfig.id,
        message: "Document completed and task marked as complete",
      };
    } catch (error) {
      console.error("Error handling document.complete:", error);
      return {
        success: false,
        event: "document.complete",
        documentId,
        esignConfigId: esignConfig.id,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  /**
   * Handle document.sign event
   * This fires when a single signer signs (may not be complete if multiple signers)
   */
  async handleDocumentSigned(
    esignConfig: ESignConfig,
    documentId: string,
    workspaceId: string | null
  ): Promise<WebhookHandlerResult> {
    // Update status to signed (intermediate state)
    await database
      .updateTable("esign_config")
      .set({
        status: "signed",
        updatedAt: new Date(),
      })
      .where("id", "=", esignConfig.id)
      .execute();

    // Log audit event
    if (workspaceId) {
      await auditLogService.logEvent({
        workspaceId,
        eventType: "esign.signed",
        actorId: "system",
        taskId: esignConfig.taskId,
        source: "signnow",
        metadata: {
          esignConfigId: esignConfig.id,
          providerDocumentId: documentId,
          signerEmail: esignConfig.signerEmail,
        },
      });
    }

    return {
      success: true,
      event: "document.sign",
      documentId,
      esignConfigId: esignConfig.id,
      message: "Document signature recorded",
    };
  },

  /**
   * Handle document.viewed event
   */
  async handleDocumentViewed(
    esignConfig: ESignConfig,
    documentId: string,
    workspaceId: string | null
  ): Promise<WebhookHandlerResult> {
    // Only update if still pending (don't overwrite signed/completed)
    if (esignConfig.status === "pending" || esignConfig.status === "sent") {
      await database
        .updateTable("esign_config")
        .set({
          status: "viewed",
          updatedAt: new Date(),
        })
        .where("id", "=", esignConfig.id)
        .execute();
    }

    // Log audit event
    if (workspaceId) {
      await auditLogService.logEvent({
        workspaceId,
        eventType: "esign.viewed",
        actorId: "system",
        taskId: esignConfig.taskId,
        source: "signnow",
        metadata: {
          esignConfigId: esignConfig.id,
          providerDocumentId: documentId,
          signerEmail: esignConfig.signerEmail,
        },
      });
    }

    return {
      success: true,
      event: "document.viewed",
      documentId,
      esignConfigId: esignConfig.id,
      message: "Document viewed status updated",
    };
  },

  /**
   * Handle document.declined event
   */
  async handleDocumentDeclined(
    esignConfig: ESignConfig,
    documentId: string,
    workspaceId: string | null
  ): Promise<WebhookHandlerResult> {
    await database
      .updateTable("esign_config")
      .set({
        status: "declined",
        updatedAt: new Date(),
      })
      .where("id", "=", esignConfig.id)
      .execute();

    // Log audit event
    if (workspaceId) {
      await auditLogService.logEvent({
        workspaceId,
        eventType: "esign.declined",
        actorId: "system",
        taskId: esignConfig.taskId,
        source: "signnow",
        metadata: {
          esignConfigId: esignConfig.id,
          providerDocumentId: documentId,
          signerEmail: esignConfig.signerEmail,
        },
      });
    }

    return {
      success: true,
      event: "document.declined",
      documentId,
      esignConfigId: esignConfig.id,
      message: "Document declined status updated",
    };
  },
};
