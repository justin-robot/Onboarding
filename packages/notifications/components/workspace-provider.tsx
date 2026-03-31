"use client";

import { type ColorMode, KnockFeedProvider } from "@knocklabs/react";
import type { ReactNode } from "react";

const knockFeedChannelId = process.env.NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID;

type WorkspaceNotificationsProviderProps = {
  children: ReactNode;
  workspaceId: string;
  theme?: ColorMode;
};

/**
 * Workspace-scoped notification provider.
 * Wraps children with a KnockFeedProvider filtered to a specific workspace.
 * Use this to show only notifications relevant to a particular workspace.
 */
export const WorkspaceNotificationsProvider = ({
  children,
  workspaceId,
  theme = "light",
}: WorkspaceNotificationsProviderProps) => {
  if (!knockFeedChannelId) {
    return <>{children}</>;
  }

  return (
    <KnockFeedProvider
      colorMode={theme}
      feedId={knockFeedChannelId}
      defaultFeedOptions={{
        archived: "exclude",
        page_size: 50,
        tenant: workspaceId,
        has_tenant: true,
      }}
    >
      {children}
    </KnockFeedProvider>
  );
};
