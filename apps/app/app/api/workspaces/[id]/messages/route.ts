import { chatService, memberService } from "@/lib/services";
import { ablyService, CHAT_EVENTS } from "@/lib/services/ably";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/workspaces/[id]/messages - Get messages for a workspace
 * Query params:
 *   - cursor: pagination cursor
 *   - limit: number of messages (default 50, max 100)
 */
export async function GET(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: workspaceId } = await params;

    // Verify user is a member of the workspace
    const isMember = await memberService.isMember(workspaceId, user.id);
    if (!isMember) {
      return errorResponse("Not a member of this workspace", 403);
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const result = await chatService.getMessages(workspaceId, cursor, limit);

    // Transform messages for the client
    const messages = result.messages.map((msg) => ({
      id: msg.id,
      type: msg.type,
      content: msg.content,
      senderId: msg.userId,
      senderName: msg.userName || "Unknown",
      senderAvatarUrl: msg.userImage || undefined,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
      attachmentIds: msg.attachmentIds,
      referencedTaskId: msg.referencedTaskId,
      referencedFileId: msg.referencedFileId,
      replyToMessageId: msg.replyToMessageId,
      replyToMessage: msg.replyToMessage,
    }));

    return json({
      messages,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  });
}

/**
 * POST /api/workspaces/[id]/messages - Send a message
 * Body: { content: string, type?: string, fileId?: string, replyToMessageId?: string }
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: workspaceId } = await params;

    // Verify user is a member of the workspace
    const isMember = await memberService.isMember(workspaceId, user.id);
    if (!isMember) {
      return errorResponse("Not a member of this workspace", 403);
    }

    const body = await request.json();
    const { content, type, fileId, replyToMessageId } = body;

    // Validate: either content or fileId must be present
    const hasContent = content && typeof content === "string" && content.trim();
    const hasFile = fileId && typeof fileId === "string";

    if (!hasContent && !hasFile) {
      return errorResponse("Message content or file attachment is required", 400);
    }

    // Determine message type
    let messageType = type || "text";
    if (hasFile && !hasContent) {
      messageType = "file";
    } else if (hasFile && hasContent) {
      // If both file and content, treat as annotation
      messageType = "annotation";
    }

    // Validate type
    const validTypes = ["text", "annotation", "file"];
    if (!validTypes.includes(messageType)) {
      return errorResponse(`Type must be one of: ${validTypes.join(", ")}`, 400);
    }

    // Send the message
    const message = await chatService.sendMessage({
      workspaceId,
      userId: user.id,
      content: hasContent ? content.trim() : "",
      type: messageType,
      attachmentIds: hasFile ? [fileId] : undefined,
      replyToMessageId: replyToMessageId || undefined,
    });

    // Fetch file info if attached
    let attachment = null;
    if (hasFile) {
      const { fileService } = await import("@/lib/services");
      const file = await fileService.getByIdWithUrl(fileId);
      if (file) {
        attachment = {
          name: file.name,
          type: file.mimeType,
          url: file.downloadUrl,
          uploadedBy: user.name || user.email,
        };
      }
    }

    // If replying to a message, we'll include the reply info from what we have
    let replyToMessage = null;

    // Prepare response payload
    const messagePayload = {
      id: message.id,
      type: message.type,
      content: message.content,
      senderId: message.userId,
      senderName: user.name || user.email,
      senderAvatarUrl: user.image || undefined,
      createdAt: message.createdAt.toISOString(),
      replyToMessageId: message.replyToMessageId,
      replyToMessage,
      attachment,
    };

    // Broadcast to real-time channel (non-blocking)
    ablyService.broadcastToChat(workspaceId, CHAT_EVENTS.MESSAGE_SENT, messagePayload).catch((err) => {
      console.error("Failed to broadcast message:", err);
    });

    return json(messagePayload);
  });
}
