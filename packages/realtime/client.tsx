"use client";

import Ably from "ably";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type AblyClientProviderProps = {
  children: ReactNode;
  tokenRequest: {
    token: string;
    issued: number;
    expires: number;
    capability: string;
    clientId?: string;
  };
};

const ablyApiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;

/**
 * Create an Ably client instance
 */
export const createAblyClient = (tokenRequest: AblyClientProviderProps["tokenRequest"]) => {
  if (!ablyApiKey) {
    console.warn("NEXT_PUBLIC_ABLY_API_KEY not configured");
    return null;
  }

  return new Ably.Realtime({ authCallback: async () => tokenRequest });
};

/**
 * Provider component for Ably realtime functionality
 */
export const AblyProvider = ({ children, tokenRequest }: AblyClientProviderProps) => {
  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null);

  useEffect(() => {
    const client = createAblyClient(tokenRequest);
    setAblyClient(client);

    return () => {
      client?.close();
    };
  }, [tokenRequest]);

  if (!ablyClient) {
    return <>{children}</>;
  }

  return (
    <AblyContext.Provider value={ablyClient}>{children}</AblyContext.Provider>
  );
};

/**
 * React context for Ably client
 */
const AblyContext = createContext<Ably.Realtime | null>(null);

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

