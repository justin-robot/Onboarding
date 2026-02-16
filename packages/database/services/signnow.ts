import { database } from "../index";
import type { ESignConfig } from "../schemas/main";

// SignNow API base URLs
const API_BASE = {
  production: "https://api.signnow.com",
  sandbox: "https://api-eval.signnow.com",
};

// Result of pushing a document to SignNow
export interface PushDocumentResult {
  documentId: string;
  signingUrl: string;
}

// SignNow API response types
interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface DocumentUploadResponse {
  id: string;
}

interface SigningLinkResponse {
  url: string;
  url_no_signup: string;
}

interface DocumentResponse {
  id: string;
  status: string;
}

// Store access token for reuse
let cachedToken: { token: string; expiresAt: number } | null = null;

function getApiBase(): string {
  return process.env.NODE_ENV === "production"
    ? API_BASE.production
    : API_BASE.sandbox;
}

function getClientCredentials(): string {
  const credentials = process.env.SIGNNOW_CLIENT_CREDENTIALS;
  if (!credentials) {
    throw new Error(
      "SIGNNOW_CLIENT_CREDENTIALS not configured. " +
        "Set this to base64(client_id:client_secret)"
    );
  }
  return credentials;
}

async function getAccessToken(): Promise<string> {
  const username = process.env.SIGNNOW_USERNAME;
  const password = process.env.SIGNNOW_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "SIGNNOW_USERNAME and SIGNNOW_PASSWORD must be configured"
    );
  }

  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
    return cachedToken.token;
  }

  const response = await fetch(`${getApiBase()}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${getClientCredentials()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "password",
      username,
      password,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SignNow auth failed: ${error}`);
  }

  const data = (await response.json()) as TokenResponse;

  // Cache token (expires_in is in seconds)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

export const signNowService = {
  /**
   * Check if SignNow is configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.SIGNNOW_CLIENT_CREDENTIALS &&
      process.env.SIGNNOW_USERNAME &&
      process.env.SIGNNOW_PASSWORD
    );
  },

  /**
   * Push a document to SignNow for signing
   *
   * @param fileId - The ID of the file in our system
   * @param signerEmail - Email of the person who should sign
   * @returns Document ID and signing URL from SignNow
   */
  async pushDocument(
    fileId: string,
    signerEmail: string
  ): Promise<PushDocumentResult> {
    if (!this.isConfigured()) {
      throw new Error("SignNow is not configured");
    }

    // Get file info from database
    const file = await database
      .selectFrom("file")
      .selectAll()
      .where("id", "=", fileId)
      .executeTakeFirst();

    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Get download URL from storage
    const { getPresignedDownloadUrl, getStorageConfig } = await import("@repo/storage");
    const downloadUrl = await getPresignedDownloadUrl(getStorageConfig(), file.storageKey);

    // Download file content
    const fileResponse = await fetch(downloadUrl);
    if (!fileResponse.ok || !fileResponse.body) {
      throw new Error(`Failed to download file: ${fileResponse.status}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const token = await getAccessToken();

    // Upload document to SignNow
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([fileBuffer], { type: file.mimeType }),
      file.name
    );

    const uploadResponse = await fetch(`${getApiBase()}/document`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`SignNow upload failed: ${error}`);
    }

    const uploadData = (await uploadResponse.json()) as DocumentUploadResponse;
    const documentId = uploadData.id;

    // Send freeform invite to signer
    const senderEmail =
      process.env.SIGNNOW_SENDER_EMAIL || "noreply@example.com";

    const inviteResponse = await fetch(
      `${getApiBase()}/document/${documentId}/invite`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: senderEmail,
          to: signerEmail,
        }),
      }
    );

    if (!inviteResponse.ok) {
      const error = await inviteResponse.text();
      throw new Error(`SignNow invite failed: ${error}`);
    }

    // Create signing link
    const linkResponse = await fetch(`${getApiBase()}/link`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        document_id: documentId,
      }),
    });

    if (!linkResponse.ok) {
      const error = await linkResponse.text();
      throw new Error(`SignNow link creation failed: ${error}`);
    }

    const linkData = (await linkResponse.json()) as SigningLinkResponse;

    // Prefer the no-signup URL for easier signing
    const signingUrl = linkData.url_no_signup || linkData.url;

    return {
      documentId,
      signingUrl,
    };
  },

  /**
   * Push a document and update the e-sign config
   * Optionally logs an audit event if audit context is provided
   * Optionally triggers esign-ready notification to assignees if notificationContext is provided
   */
  async pushAndUpdateConfig(
    esignConfigId: string,
    fileId: string,
    signerEmail: string,
    auditContext?: { workspaceId: string; actorId: string; taskId?: string },
    notificationContext?: import("./notificationContext").NotificationContext
  ): Promise<ESignConfig | null> {
    const result = await this.pushDocument(fileId, signerEmail);

    // Update the e-sign config with provider details
    const updated = await database
      .updateTable("esign_config")
      .set({
        providerDocumentId: result.documentId,
        providerSigningUrl: result.signingUrl,
        status: "sent",
        updatedAt: new Date(),
      })
      .where("id", "=", esignConfigId)
      .returningAll()
      .executeTakeFirst();

    // Log audit event if context provided
    if (updated && auditContext) {
      const { auditLogService } = await import("./auditLog");
      await auditLogService.logEvent({
        workspaceId: auditContext.workspaceId,
        eventType: "esign.sent",
        actorId: auditContext.actorId,
        taskId: auditContext.taskId,
        source: "web",
        metadata: {
          esignConfigId: updated.id,
          providerDocumentId: result.documentId,
          signerEmail,
          provider: "signnow",
        },
      });
    }

    // Trigger esign-ready notification if context provided
    if (updated && notificationContext && auditContext?.taskId) {
      try {
        // Get task, workspace, file, and assignees info for the notification
        const task = await database
          .selectFrom("task")
          .innerJoin("section", "section.id", "task.sectionId")
          .innerJoin("workspace", "workspace.id", "section.workspaceId")
          .select([
            "task.id",
            "task.title",
            "workspace.id as workspaceId",
            "workspace.name as workspaceName",
          ])
          .where("task.id", "=", auditContext.taskId)
          .executeTakeFirst();

        const file = await database
          .selectFrom("file")
          .select(["name"])
          .where("id", "=", fileId)
          .executeTakeFirst();

        const assignees = await database
          .selectFrom("task_assignee")
          .select("userId")
          .where("taskId", "=", auditContext.taskId)
          .execute();

        if (task && file) {
          // Notify all assignees
          for (const assignee of assignees) {
            await notificationContext.triggerWorkflow({
              workflowId: "esign-ready",
              recipientId: assignee.userId,
              data: {
                workspaceId: task.workspaceId,
                workspaceName: task.workspaceName,
                taskId: task.id,
                taskTitle: task.title,
                documentName: file.name,
              },
              tenant: task.workspaceId,
            });
          }
        }
      } catch (notifyError) {
        // Log but don't fail the operation
        console.error("[signnow] Failed to send esign-ready notification:", notifyError);
      }
    }

    return updated ?? null;
  },

  /**
   * Get document status from SignNow
   */
  async getDocumentStatus(
    documentId: string
  ): Promise<{ status: string; isComplete: boolean }> {
    if (!this.isConfigured()) {
      throw new Error("SignNow is not configured");
    }

    const token = await getAccessToken();

    const response = await fetch(`${getApiBase()}/document/${documentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SignNow get document failed: ${error}`);
    }

    const doc = (await response.json()) as DocumentResponse;

    // SignNow statuses include: pending, fulfilled, etc.
    const isComplete = doc.status === "fulfilled" || doc.status === "completed";

    return {
      status: doc.status,
      isComplete,
    };
  },

  /**
   * Get the signed document download URL
   */
  async getSignedDocumentUrl(documentId: string): Promise<string | null> {
    if (!this.isConfigured()) {
      throw new Error("SignNow is not configured");
    }

    const token = await getAccessToken();

    const response = await fetch(
      `${getApiBase()}/document/${documentId}/download/link`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { link?: string };
    return data.link || null;
  },

  /**
   * Cancel/void a document invite
   */
  async cancelDocument(documentId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error("SignNow is not configured");
    }

    const token = await getAccessToken();

    try {
      const response = await fetch(
        `${getApiBase()}/document/${documentId}/fieldinvitecancel`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.ok;
    } catch (err) {
      console.error("Failed to cancel document:", err);
      return false;
    }
  },
};
