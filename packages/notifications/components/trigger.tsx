"use client";

import {
  NotificationFeedPopover,
  useKnockFeed,
} from "@knocklabs/react";
import { Bell } from "lucide-react";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

// Required CSS import, unless you're overriding the styling
import "@knocklabs/react/dist/index.css";
import "../styles.css";

export const NotificationsTrigger = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const notifButtonRef = useRef<HTMLButtonElement>(null);
  const { useFeedStore } = useKnockFeed();
  const { metadata } = useFeedStore();
  const unreadCount = metadata?.unread_count ?? 0;

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleClose = (event: Event) => {
    if (event.target === notifButtonRef.current) {
      return;
    }

    setIsVisible(false);
  };

  // Don't render anything during SSR or if Knock is not configured
  if (!isMounted || !process.env.NEXT_PUBLIC_KNOCK_API_KEY) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        ref={notifButtonRef}
        className="relative p-2 rounded-md hover:bg-accent transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-medium text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      <NotificationFeedPopover
        buttonRef={notifButtonRef as RefObject<HTMLElement>}
        isVisible={isVisible}
        onClose={handleClose}
      />
    </>
  );
};
