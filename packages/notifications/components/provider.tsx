"use client";

import {
  type ColorMode,
  KnockFeedProvider,
  KnockProvider,
} from "@knocklabs/react";
import type { ReactNode } from "react";

const knockApiKey = process.env.NEXT_PUBLIC_KNOCK_API_KEY;
const knockFeedChannelId = process.env.NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID;

type NotificationsProviderProps = {
  children: ReactNode;
  userId: string;
  theme: ColorMode;
};

export const NotificationsProvider = ({
  children,
  theme,
  userId,
}: NotificationsProviderProps) => {
  if (!(knockApiKey && knockFeedChannelId)) {
    return children;
  }

  return (
    <KnockProvider apiKey={knockApiKey} userId={userId}>
      <KnockFeedProvider
        colorMode={theme}
        feedId={knockFeedChannelId}
        defaultFeedOptions={{
          archived: "exclude",
          page_size: 50,
        }}
      >
        {children}
      </KnockFeedProvider>
    </KnockProvider>
  );
};
