"use client";

import { useCallback, useState } from "react";
import {
  AblyProvider,
  useWorkspaceChat,
  useAblyToken,
  type ChatMessagePayload,
} from "@repo/realtime";
import { ChatPanel, type Message } from "./chat-panel";
import { ChatPanelWithPolling } from "./realtime-chat";

interface RealtimeChatProps {
  workspaceId: string;
  currentUserId: string;
  initialMessages: Message[];
}

/**
 * Actual implementation that uses Ably
 * This is dynamically imported with ssr: false to avoid Node.js dependency issues
 */
export function RealtimeChatImpl({
  workspaceId,
  currentUserId,
  initialMessages,
}: RealtimeChatProps) {
  const { token, loading, error } = useAblyToken(workspaceId);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Connecting to chat...</div>
      </div>
    );
  }

  if (error || !token) {
    // Fallback to non-realtime chat (polling)
    return (
      <ChatPanelWithPolling
        workspaceId={workspaceId}
        currentUserId={currentUserId}
        initialMessages={initialMessages}
      />
    );
  }

  return (
    <AblyProvider tokenRequest={token}>
      <RealtimeChatInner
        workspaceId={workspaceId}
        currentUserId={currentUserId}
        initialMessages={initialMessages}
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
}: RealtimeChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  // Handle incoming real-time messages
  const handleNewMessage = useCallback((payload: ChatMessagePayload) => {
    const newMessage: Message = {
      id: payload.id,
      type: payload.type as Message["type"],
      content: payload.content,
      senderId: payload.senderId,
      senderName: payload.senderName,
      senderAvatarUrl: payload.senderAvatarUrl,
      createdAt: new Date(payload.createdAt),
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

  // Send message handler
  const handleSendMessage = async (content: string) => {
    const response = await fetch(`/api/workspaces/${workspaceId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
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
      meetings={[]}
      currentUserId={currentUserId}
      workspaceId={workspaceId}
      onSendMessage={handleSendMessage}
    />
  );
}
