"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { ChatPanel, type Message } from "./chat-panel";

interface RealtimeChatProps {
  workspaceId: string;
  currentUserId: string;
  initialMessages: Message[];
}

// Dynamically import the realtime implementation with SSR disabled
const RealtimeChatImpl = dynamic(
  () => import("./realtime-chat-impl").then((mod) => mod.RealtimeChatImpl),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Connecting to chat...</div>
      </div>
    ),
  }
);

/**
 * Chat panel with real-time message updates via Ably
 */
export function RealtimeChat({
  workspaceId,
  currentUserId,
  initialMessages,
}: RealtimeChatProps) {
  return (
    <RealtimeChatImpl
      workspaceId={workspaceId}
      currentUserId={currentUserId}
      initialMessages={initialMessages}
    />
  );
}

/**
 * Fallback chat panel with polling (when Ably is unavailable)
 * Exported for use by the impl component
 */
export function ChatPanelWithPolling({
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
