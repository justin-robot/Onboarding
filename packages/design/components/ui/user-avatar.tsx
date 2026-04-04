"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { cn } from "@repo/design/lib/utils";
import { getAvatarProps } from "@repo/design/lib/avatar-utils";

export interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  userId?: string | null;
  imageUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Use "primary" for the current user's avatar (uses theme primary color) */
  variant?: "default" | "primary";
  className?: string;
}

const sizeClasses = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-16 w-16",
};

const textSizeClasses = {
  xs: "text-[8px]",
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-lg",
};

export function UserAvatar({
  name,
  email,
  userId,
  imageUrl,
  size = "md",
  variant = "default",
  className,
}: UserAvatarProps) {
  const identifier = userId || email;
  const { initial, colorClass } = getAvatarProps(name || email, identifier);

  // Use theme primary color for "primary" variant (current user's avatar)
  const bgColorClass = variant === "primary" ? "bg-primary text-primary-foreground" : cn(colorClass, "text-white");

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name || "User"} />}
      <AvatarFallback
        className={cn(bgColorClass, "font-medium", textSizeClasses[size])}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
