"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Checks for pending invitation token in sessionStorage after sign-in
 * and redirects to the invite page to complete acceptance
 */
export function PendingInviteHandler() {
  const router = useRouter();

  useEffect(() => {
    const pendingToken = sessionStorage.getItem("pendingInviteToken");

    if (pendingToken) {
      // Clear the token immediately to prevent loops
      sessionStorage.removeItem("pendingInviteToken");

      // Redirect to invite page to complete acceptance
      router.push(`/invite/${pendingToken}`);
    }
  }, [router]);

  // This component doesn't render anything
  return null;
}
