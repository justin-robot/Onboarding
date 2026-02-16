"use client";

import { useState, useEffect, useCallback } from "react";
import { ActivityFeed, type AuditEntry } from "@repo/design/components/moxo-layout";
import { useWorkspaceEvents, WORKSPACE_EVENTS } from "@repo/realtime";

interface WorkspaceActivityProps {
  workspaceId: string;
  currentUserId: string;
}

export function WorkspaceActivity({ workspaceId, currentUserId }: WorkspaceActivityProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | undefined>();

  // Fetch activity entries
  const fetchActivity = useCallback(async (offset = 0, append = false) => {
    if (!append) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/activity?limit=50&offset=${offset}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch activity");
      }

      const data = await response.json();

      const newEntries: AuditEntry[] = data.entries.map((entry: {
        id: string;
        eventType: string;
        actorId: string;
        actorName?: string;
        actorAvatarUrl?: string;
        taskId?: string;
        taskTitle?: string;
        sectionTitle?: string;
        metadata?: Record<string, unknown>;
        createdAt: string;
      }) => ({
        id: entry.id,
        eventType: entry.eventType,
        actorId: entry.actorId,
        actorName: entry.actorName,
        actorAvatarUrl: entry.actorAvatarUrl,
        taskId: entry.taskId,
        taskTitle: entry.taskTitle,
        sectionTitle: entry.sectionTitle,
        metadata: entry.metadata,
        createdAt: new Date(entry.createdAt),
      }));

      if (append) {
        setEntries((prev) => [...prev, ...newEntries]);
      } else {
        setEntries(newEntries);
      }

      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch (error) {
      console.error("Failed to fetch activity:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [workspaceId]);

  // Initial fetch
  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Subscribe to real-time workspace events to refresh activity
  useWorkspaceEvents(workspaceId, {
    onTaskCompleted: () => fetchActivity(),
    onTaskUpdated: () => fetchActivity(),
    onSectionUpdated: () => fetchActivity(),
  });

  // Handle load more
  const handleLoadMore = () => {
    if (nextOffset !== undefined && !isLoadingMore) {
      fetchActivity(nextOffset, true);
    }
  };

  return (
    <ActivityFeed
      entries={entries}
      currentUserId={currentUserId}
      hasMore={hasMore}
      onLoadMore={handleLoadMore}
      isLoadingMore={isLoadingMore}
      isLoading={isLoading}
      title="Activity"
      groupByDate={true}
    />
  );
}
