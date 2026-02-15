"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AblyProvider,
  useWorkspaceChat,
  useAblyToken,
  type ChatMessagePayload,
} from "@repo/realtime";
import { ChatPanel, type Message } from "./chat-panel";

interface RealtimeChatProps {
  workspaceId: string;
  currentUserId: string;
  initialMessages: Message[];
}

/**
 * Chat panel with real-time message updates via Ably
 */
export function RealtimeChat({
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
    // Fallback to non-realtime chat (polling will be handled by parent)
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

/**
 * Fallback chat panel with polling (when Ably is unavailable)
 */
function ChatPanelWithPolling({
  workspaceId,
  currentUserId,
  initialMessages,
}: RealtimeChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  // Poll for new messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/messages`);
        if (response.ok) {
          const data = await response.json();
          const formattedMessages: Message[] = data.messages.reverse().map((msg: {
            id: string;
            type: string;
            content: string;
            senderId: string;
            senderName: string;
            senderAvatarUrl?: string;
            createdAt: string;
          }) => ({
            id: msg.id,
            type: msg.type as Message["type"],
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.senderName,
            senderAvatarUrl: msg.senderAvatarUrl,
            createdAt: new Date(msg.createdAt),
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };

    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [workspaceId]);

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

    const data = await response.json();
    const newMessage: Message = {
      id: data.id,
      type: data.type as Message["type"],
      content: data.content,
      senderId: data.senderId,
      senderName: data.senderName,
      createdAt: new Date(data.createdAt),
    };

    setMessages((prev) => [...prev, newMessage]);
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
