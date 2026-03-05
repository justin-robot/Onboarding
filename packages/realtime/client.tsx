"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type Ably from "ably";

type AblyClientProviderProps = {
  children: ReactNode;
  workspaceId: string;
};

/**
 * React context for Ably client
 */
const AblyContext = createContext<Ably.Realtime | null>(null);

/**
 * Provider component for Ably realtime functionality
 * Uses authUrl to automatically handle token refresh
 */
export const AblyProvider = ({ children, workspaceId }: AblyClientProviderProps) => {
  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null);

  useEffect(() => {
    let client: Ably.Realtime | null = null;

    // Dynamically import ably to avoid SSR issues
    import("ably").then((AblyModule) => {
      client = new AblyModule.default.Realtime({
        authCallback: async (tokenParams, callback) => {
          try {
            const response = await fetch("/api/realtime/token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ workspaceId }),
            });

            if (!response.ok) {
              throw new Error(`Token request failed: ${response.status}`);
            }

            const tokenRequest = await response.json();
            callback(null, tokenRequest);
          } catch (err) {
            console.error("[Ably] Auth error:", err);
            callback(err instanceof Error ? err.message : "Auth failed", null);
          }
        },
      });

      setAblyClient(client);
    });

    return () => {
      client?.close();
    };
  }, [workspaceId]);

  // Don't render children until client is ready - they depend on the context
  if (!ablyClient) {
    return null;
  }

  return (
    <AblyContext.Provider value={ablyClient}>{children}</AblyContext.Provider>
  );
};

export const useAbly = () => {
  const context = useContext(AblyContext);
  if (!context) {
    throw new Error("useAbly must be used within AblyProvider");
  }
  return context;
};

/**
 * Hook to subscribe to an Ably channel
 */
export const useAblyChannel = (
  channelName: string,
  callback: (message: Ably.Message) => void
) => {
  const ably = useAbly();
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = ably.channels.get(channelName);
    channelRef.current = channel;

    channel.subscribe(callback);

    return () => {
      channel.unsubscribe();
    };
  }, [ably, channelName, callback]);
};

/**
 * Hook to subscribe to specific events on an Ably channel
 */
export const useAblyEvent = (
  channelName: string,
  eventName: string,
  callback: (data: unknown) => void
) => {
  const ably = useAbly();

  useEffect(() => {
    const channel = ably.channels.get(channelName);
    channel.subscribe(eventName, callback);

    return () => {
      channel.unsubscribe(eventName, callback);
    };
  }, [ably, channelName, eventName, callback]);
};

/**
 * Hook to publish messages to an Ably channel
 */
export const usePublishMessage = () => {
  const ably = useAbly();

  return (channelName: string, eventName: string, data: unknown) => {
    const channel = ably.channels.get(channelName);
    return channel.publish(eventName, data);
  };
};
