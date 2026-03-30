"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/design/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design/components/ui/card";
import { Badge } from "@repo/design/components/ui/badge";
import { Mail, Loader2, Clock, Check, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export interface PendingInvitationData {
  id: string;
  token: string;
  email: string;
  role: string;
  workspaceId: string;
  workspaceName: string;
  inviterName: string;
  expiresAt: string;
  createdAt: string;
}

interface PendingInvitationsProps {
  invitations: PendingInvitationData[];
}

export function PendingInvitations({ invitations: initialInvitations }: PendingInvitationsProps) {
  const router = useRouter();
  const [invitations, setInvitations] = useState(initialInvitations);
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (invitations.length === 0) {
    return null;
  }

  const handleAccept = async (invitation: PendingInvitationData) => {
    setProcessingId(invitation.id);
    try {
      const response = await fetch("/api/invitations/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: invitation.token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to accept invitation");
      }

      const result = await response.json();
      toast.success(`You've joined ${invitation.workspaceName}`);

      // Remove from list and navigate
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      router.push(`/workspace/${result.workspaceId}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept invitation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitation: PendingInvitationData) => {
    setProcessingId(invitation.id);
    try {
      const response = await fetch(`/api/invitations/${invitation.token}/decline`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to decline invitation");
      }

      toast.success("Invitation declined");
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to decline invitation");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5" data-testid="pending-invitations-section">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Pending Invitations</CardTitle>
          <Badge variant="secondary">{invitations.length}</Badge>
        </div>
        <CardDescription>
          You have been invited to join the following workspaces
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invitations.map((invitation) => {
            const isExpiringSoon =
              new Date(invitation.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
            const isProcessing = processingId === invitation.id;

            return (
              <div
                key={invitation.id}
                data-testid="pending-invitation"
                data-invitation-id={invitation.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border bg-background p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{invitation.workspaceName}</h4>
                    <Badge variant="outline" className="text-xs">
                      {invitation.role === "admin" ? "Admin" : "User"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Invited by {invitation.inviterName}
                  </p>
                  <div className={`flex items-center gap-1 text-xs ${isExpiringSoon ? "text-amber-500" : "text-muted-foreground"}`}>
                    <Clock className="h-3 w-3" />
                    <span>
                      Expires {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDecline(invitation)}
                    disabled={isProcessing}
                    data-testid="decline-invitation-btn"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="mr-1 h-4 w-4" />
                        Decline
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invitation)}
                    disabled={isProcessing}
                    data-testid="accept-invitation-btn"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="mr-1 h-4 w-4" />
                        Accept
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
