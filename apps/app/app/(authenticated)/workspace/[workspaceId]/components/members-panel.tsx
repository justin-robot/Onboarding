"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/design/components/ui/button";
import { Input } from "@repo/design/components/ui/input";
import { Label } from "@repo/design/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design/components/ui/card";
import { Badge } from "@repo/design/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/design/components/ui/avatar";
import {
  Users,
  Mail,
  X,
  Loader2,
  Clock,
  UserPlus,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

interface MembersPanelProps {
  workspaceId: string;
  onClose: () => void;
  currentUserRole?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  switch (role) {
    case "admin":
      return "default";
    case "account_manager":
      return "secondary";
    default:
      return "outline";
  }
}

function formatRole(role: string): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "account_manager":
      return "Account Manager";
    case "user":
      return "User";
    default:
      return role;
  }
}

export function MembersPanel({ workspaceId, onClose, currentUserRole }: MembersPanelProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [sending, setSending] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const canInvite = currentUserRole === "admin";

  // Fetch members and invitations
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [membersRes, invitationsRes] = await Promise.all([
          fetch(`/api/workspaces/${workspaceId}/members`),
          canInvite ? fetch(`/api/workspaces/${workspaceId}/invitations`) : Promise.resolve(null),
        ]);

        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData);
        }

        if (invitationsRes?.ok) {
          const invitationsData = await invitationsRes.json();
          setInvitations(invitationsData);
        }
      } catch (error) {
        console.error("Error fetching members:", error);
        toast.error("Failed to load members");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspaceId, canInvite]);

  // Send invitation
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invitation");
      }

      const invitation = await response.json();
      setInvitations((prev) => [...prev, invitation]);
      setInviteEmail("");
      toast.success(`Invitation sent to ${inviteEmail}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  // Cancel invitation
  const handleCancelInvitation = async (invitationId: string) => {
    setCancellingId(invitationId);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/invitations/${invitationId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to cancel invitation");
      }

      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      toast.success("Invitation cancelled");
    } catch (error) {
      toast.error("Failed to cancel invitation");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="font-semibold">Members</h2>
          <Badge variant="secondary" className="ml-1">
            {members.length}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Invite form (admin only) */}
            {canInvite && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Invite Member
                  </CardTitle>
                  <CardDescription>
                    Send an invitation to join this workspace
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleInvite} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        disabled={sending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="account_manager">Account Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={sending}>
                      {sending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Send Invitation
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Pending invitations */}
            {canInvite && invitations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Invitations ({invitations.length})
                </h3>
                <div className="space-y-2">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{invitation.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRole(invitation.role)} &middot; Expires{" "}
                            {new Date(invitation.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleCancelInvitation(invitation.id)}
                        disabled={cancellingId === invitation.id}
                      >
                        {cancellingId === invitation.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members list */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Workspace Members
              </h3>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.image} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.name || member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.name || member.email}
                        </p>
                        {member.name && (
                          <p className="text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {formatRole(member.role)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
