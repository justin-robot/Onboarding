"use client";

import {
  NotificationFeedPopover,
  NotificationCell,
  useKnockFeed,
} from "@knocklabs/react";
import { Bell, Check, CheckCheck, Archive, Inbox, Settings } from "lucide-react";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

// Required CSS import, unless you're overriding the styling
import "@knocklabs/react/dist/index.css";
import "../styles.css";

type FeedView = "inbox" | "archived";

// Notification data structure from our workflows
interface NotificationData {
  workspaceId?: string;
  taskId?: string;
  workspaceName?: string;
  taskTitle?: string;
}

// Props for the notification trigger
interface NotificationsTriggerProps {
  /**
   * Callback when a notification is clicked.
   * Receives workspaceId and optional taskId for navigation.
   * Can be async for validation before navigation.
   */
  onNotificationClick?: (data: { workspaceId: string; taskId?: string }) => void | Promise<void>;
  /**
   * Callback when settings button is clicked.
   * Used to navigate to notification preferences.
   */
  onSettingsClick?: () => void;
}

export const NotificationsTrigger = ({
  onNotificationClick,
  onSettingsClick,
}: NotificationsTriggerProps = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [feedView, setFeedView] = useState<FeedView>("inbox");
  const notifButtonRef = useRef<HTMLButtonElement>(null);
  const { feedClient, useFeedStore } = useKnockFeed();
  const { metadata, items } = useFeedStore();
  const unreadCount = metadata?.unread_count ?? 0;
  const unreadItems = items?.filter((item) => !item.read_at) ?? [];

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update feed options when view changes
  useEffect(() => {
    if (feedClient && isMounted) {
      feedClient.fetch({
        archived: feedView === "archived" ? "only" : "exclude",
      });
    }
  }, [feedView, feedClient, isMounted]);

  const handleClose = useCallback((event: Event) => {
    if (event.target === notifButtonRef.current) {
      return;
    }
    setIsVisible(false);
    // Reset to inbox view when closing
    setFeedView("inbox");
  }, []);

  // Handle notification click - navigate to the relevant task
  const handleNotificationClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any) => {
      const data = item.data as NotificationData | null;

      if (data?.workspaceId && onNotificationClick) {
        // Close the popover
        setIsVisible(false);
        // Call the navigation callback
        onNotificationClick({
          workspaceId: data.workspaceId,
          taskId: data.taskId,
        });
      }

      // Mark as read when clicked
      if (!item.read_at && feedClient) {
        feedClient.markAsRead(item);
      }
    },
    [onNotificationClick, feedClient]
  );

  // Handle mark as read for individual item
  const handleMarkAsRead = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: React.MouseEvent, item: any) => {
      e.stopPropagation();
      if (feedClient && !item.read_at) {
        feedClient.markAsRead(item);
      }
    },
    [feedClient]
  );

  // Handle unarchive
  const handleUnarchive = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: React.MouseEvent, item: any) => {
      e.stopPropagation();
      if (feedClient && item.archived_at) {
        feedClient.markAsUnarchived(item);
      }
    },
    [feedClient]
  );

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(() => {
    if (feedClient && unreadItems.length > 0) {
      feedClient.markAsRead(unreadItems);
    }
  }, [feedClient, unreadItems]);

  // Custom render for notification items
  const renderItem = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ item, ...props }: { item: any; [key: string]: unknown }) => {
      const isUnread = !item.read_at;
      const isArchived = !!item.archived_at;

      return (
        <div
          className="rnf-notification-cell-wrapper group relative cursor-pointer"
          onClick={(e) => {
            // Prevent any default anchor behavior
            e.preventDefault();
            e.stopPropagation();
            handleNotificationClick(item);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleNotificationClick(item);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <NotificationCell {...props} item={item}>
            {/* Action buttons overlay */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isArchived ? (
                <button
                  type="button"
                  onClick={(e) => handleUnarchive(e, item)}
                  className="p-1.5 rounded-md bg-background hover:bg-accent border border-border shadow-sm"
                  title="Restore from archive"
                >
                  <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ) : (
                <>
                  {isUnread && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(e, item)}
                      className="p-1.5 rounded-md bg-background hover:bg-accent border border-border shadow-sm"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </>
              )}
            </div>
          </NotificationCell>
        </div>
      );
    },
    [handleMarkAsRead, handleUnarchive, handleNotificationClick]
  );

  // Don't render anything during SSR or if Knock is not configured
  if (!isMounted || !process.env.NEXT_PUBLIC_KNOCK_API_KEY) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        ref={notifButtonRef}
        className="relative p-2 rounded-md hover:bg-accent transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold text-white bg-red-500 rounded-full shadow-sm ring-2 ring-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      <NotificationFeedPopover
        buttonRef={notifButtonRef as RefObject<HTMLElement>}
        isVisible={isVisible}
        onClose={handleClose}
        placement="bottom-end"
        onNotificationClick={handleNotificationClick}
        renderItem={renderItem}
        renderHeader={() => (
          <div className="rnf-notification-feed-header">
            <div className="flex items-center justify-between w-full px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Notifications</span>
                {onSettingsClick && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsVisible(false);
                      onSettingsClick();
                    }}
                    className="p-1 rounded-md hover:bg-accent transition-colors"
                    title="Notification settings"
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {feedView === "inbox" && unreadItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all as read
                  </button>
                )}
                <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted">
                <button
                  type="button"
                  onClick={() => setFeedView("inbox")}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    feedView === "inbox"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Inbox className="h-3.5 w-3.5 inline-block mr-1" />
                  Inbox
                </button>
                <button
                  type="button"
                  onClick={() => setFeedView("archived")}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    feedView === "archived"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Archive className="h-3.5 w-3.5 inline-block mr-1" />
                  Archived
                </button>
                </div>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
};
