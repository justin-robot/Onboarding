"use client";

import {
  AblyProvider,
  useWorkspaceEvents,
} from "@repo/realtime";

interface RealtimeWorkspaceEventsProps {
  workspaceId: string;
  onWorkspaceUpdate: () => void;
}

/**
 * Actual implementation that uses Ably
 * This is dynamically imported with ssr: false to avoid Node.js dependency issues
 */
export function RealtimeWorkspaceEventsImpl({
  workspaceId,
  onWorkspaceUpdate,
}: RealtimeWorkspaceEventsProps) {
  return (
    <AblyProvider workspaceId={workspaceId}>
      <WorkspaceEventsSubscriber
        workspaceId={workspaceId}
        onWorkspaceUpdate={onWorkspaceUpdate}
      />
    </AblyProvider>
  );
}

/**
 * Inner component that uses Ably hooks (must be inside AblyProvider)
 */
function WorkspaceEventsSubscriber({
  workspaceId,
  onWorkspaceUpdate,
}: RealtimeWorkspaceEventsProps) {
  // Subscribe to all workspace events - triggers refresh on any change
  useWorkspaceEvents(workspaceId, {
    onAnyEvent: onWorkspaceUpdate,
  });

  // This component renders nothing
  return null;
}
