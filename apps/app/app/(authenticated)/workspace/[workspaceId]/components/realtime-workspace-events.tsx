"use client";

import dynamic from "next/dynamic";

interface RealtimeWorkspaceEventsProps {
  workspaceId: string;
  onWorkspaceUpdate: () => void;
}

// Dynamically import the actual implementation with SSR disabled
// This prevents ably and its Node.js dependencies from being bundled for SSR
const RealtimeWorkspaceEventsImpl = dynamic(
  () => import("./realtime-workspace-events-impl").then((mod) => mod.RealtimeWorkspaceEventsImpl),
  { ssr: false }
);

/**
 * Component that subscribes to workspace events and triggers refresh on changes
 * Renders nothing - just handles real-time subscriptions
 */
export function RealtimeWorkspaceEvents({
  workspaceId,
  onWorkspaceUpdate,
}: RealtimeWorkspaceEventsProps) {
  return (
    <RealtimeWorkspaceEventsImpl
      workspaceId={workspaceId}
      onWorkspaceUpdate={onWorkspaceUpdate}
    />
  );
}
