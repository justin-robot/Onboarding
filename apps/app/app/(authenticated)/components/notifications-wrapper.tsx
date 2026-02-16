"use client";

import type { ReactNode } from "react";
import { NotificationsProvider } from "@repo/notifications";
import { useTheme } from "next-themes";

interface NotificationsWrapperProps {
  children: ReactNode;
  userId: string;
}

export function NotificationsWrapper({ children, userId }: NotificationsWrapperProps) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <NotificationsProvider userId={userId} theme={theme}>
      {children}
    </NotificationsProvider>
  );
}
