"use client";

import { useCallback, useState } from "react";
import {
  AblyProvider,
  useWorkspaceChat,
  type ChatMessagePayload,
} from "@repo/realtime";
import { ChatPanel, type Message } from "./chat-panel";
import { MeetingsPanel } from "./meetings-panel";

interface RealtimeChatProps {
  workspaceId: string;
  currentUserId: string;
  initialMessages: Message[];
  activeTab?: "chat" | "meetings";
  onTabChange?: (tab: "chat" | "meetings") => void;
}

/**
 * Actual implementation that uses Ably
 * This is dynamically imported with ssr: false to avoid Node.js dependency issues
 */
export function RealtimeChatImpl({
  workspaceId,
  currentUserId,
  initialMessages,
  activeTab,
  onTabChange,
}: RealtimeChatProps) {
  return (
    <AblyProvider workspaceId={workspaceId}>
      <RealtimeChatInner
        workspaceId={workspaceId}
        currentUserId={currentUserId}
        initialMessages={initialMessages}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
    </AblyProvider>
  );
}

/**
 * Inner component that uses Ably hooks (must be inside AblyProvider)
 */
function RealtimeChatInner({
  workspaceId,
  currentUserId,
  initialMessages,
  activeTab,
  onTabChange,
}: RealtimeChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  // Handle incoming real-time messages
  const handleNewMessage = useCallback((payload: ChatMessagePayload & {
    replyToMessageId?: string;
    replyToMessage?: {
      id: string;
      content: string;
      senderId: string;
      senderName: string;
      senderAvatarUrl?: string;
    };
  }) => {
    const newMessage: Message = {
      id: payload.id,
      type: payload.type as Message["type"],
      content: payload.content,
      senderId: payload.senderId,
      senderName: payload.senderName,
      senderAvatarUrl: payload.senderAvatarUrl,
      createdAt: new Date(payload.createdAt),
      replyToMessageId: payload.replyToMessageId,
      replyToMessage: payload.replyToMessage,
    };

    setMessages((prev) => {
      // Check if message already exists (to avoid duplicates)
      if (prev.some((m) => m.id === newMessage.id)) {
        return prev;
      }
      return [...prev, newMessage];
    });
  }, []);

  const handleMessageDeleted = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  // Subscribe to chat events
  useWorkspaceChat(workspaceId, {
    onMessage: handleNewMessage,
    onMessageDeleted: handleMessageDeleted,
  });

  // Upload file helper
  const uploadFile = async (file: File): Promise<{ id: string; name: string; url?: string }> => {
    // Get presigned URL
    const uploadResponse = await fetch(`/api/workspaces/${workspaceId}/files/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
      }),
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to get upload URL");
    }

    const { uploadUrl, key } = await uploadResponse.json();

    // Upload to S3
    const s3Response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });

    if (!s3Response.ok) {
      throw new Error("Failed to upload file");
    }

    // Confirm upload
    const confirmResponse = await fetch(`/api/workspaces/${workspaceId}/files/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      }),
    });

    if (!confirmResponse.ok) {
      throw new Error("Failed to confirm upload");
    }

    return confirmResponse.json();
  };

  // Send message handler
  const handleSendMessage = async (content: string, attachment?: File, replyToMessageId?: string) => {
    let fileId: string | undefined;

    // Upload attachment if present
    if (attachment) {
      const uploadedFile = await uploadFile(attachment);
      fileId = uploadedFile.id;
    }

    const response = await fetch(`/api/workspaces/${workspaceId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        fileId,
        replyToMessageId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to send message");
    }

    // Message will appear via real-time subscription
    // But also add optimistically for better UX
    const data = await response.json();
    const optimisticMessage: Message = {
      id: data.id,
      type: data.type as Message["type"],
      content: data.content,
      senderId: data.senderId,
      senderName: data.senderName,
      createdAt: new Date(data.createdAt),
      attachment: data.attachment,
      replyToMessageId: data.replyToMessageId,
      replyToMessage: data.replyToMessage,
    };

    setMessages((prev) => {
      if (prev.some((m) => m.id === optimisticMessage.id)) {
        return prev;
      }
      return [...prev, optimisticMessage];
    });
  };

  return (
    <ChatPanel
      messages={messages}
      currentUserId={currentUserId}
      workspaceId={workspaceId}
      onSendMessage={handleSendMessage}
      meetingsContent={<MeetingsPanel workspaceId={workspaceId} hideHeader />}
      activeTab={activeTab}
      onTabChange={onTabChange}
    />
  );
}
