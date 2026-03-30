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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/design/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design/components/ui/dialog";
import {
  Users,
  Mail,
  X,
  Loader2,
  Clock,
  UserPlus,
  Send,
  Trash2,
  Copy,
  Check,
  ChevronRight,
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
  token?: string;
  expiresAt: string;
  createdAt: string;
}

interface MembersPanelProps {
  workspaceId: string;
  onClose: () => void;
  currentUserRole?: string;
  isWorkspacePublished?: boolean;
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
    default:
      return "outline";
  }
}

function formatRole(role: string): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "user":
      return "User";
    default:
      return role;
  }
}

export function MembersPanel({ workspaceId, onClose, currentUserRole, isWorkspacePublished = true }: MembersPanelProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [sending, setSending] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Member details dialog state
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<string>("");
  const [savingRole, setSavingRole] = useState(false);
  const [removingMember, setRemovingMember] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const canInvite = currentUserRole === "admin";
  const isAdmin = currentUserRole === "admin";

  // Copy invitation link to clipboard
  const handleCopyLink = async (invitation: Invitation) => {
    if (!invitation.token) return;

    const inviteUrl = `${window.location.origin}/invite/${invitation.token}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedId(invitation.id);
      toast.success("Invitation link copied to clipboard");

      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

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
      toast.success(
        isWorkspacePublished
          ? `Invitation sent to ${inviteEmail}`
          : `Invitation queued for ${inviteEmail} (will be sent on publish)`
      );
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

  // Open member details dialog
  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setEditingRole(member.role);
    setShowMemberDialog(true);
  };

  // Close member details dialog
  const handleCloseMemberDialog = () => {
    setShowMemberDialog(false);
    setSelectedMember(null);
    setEditingRole("");
    setShowRemoveConfirm(false);
  };

  // Update member role
  const handleUpdateRole = async () => {
    if (!selectedMember || editingRole === selectedMember.role) return;

    setSavingRole(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/members/${selectedMember.userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: editingRole }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update role");
      }

      // Update local state
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id ? { ...m, role: editingRole } : m
        )
      );
      setSelectedMember({ ...selectedMember, role: editingRole });
      toast.success(`Role updated to ${formatRole(editingRole)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setSavingRole(false);
    }
  };

  // Remove member from workspace
  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    setRemovingMember(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/members/${selectedMember.userId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove member");
      }

      // Update local state
      setMembers((prev) => prev.filter((m) => m.id !== selectedMember.id));
      handleCloseMemberDialog();
      toast.success(`${selectedMember.name || selectedMember.email} removed from workspace`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setRemovingMember(false);
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
      <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 space-y-6">
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
                    {isWorkspacePublished
                      ? "Send an invitation to join this workspace"
                      : "Queue an invitation (email will be sent when workspace is published)"}
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
                  {isWorkspacePublished
                    ? `Pending Invitations (${invitations.length})`
                    : `Queued Invitations (${invitations.length})`}
                </h3>
                {!isWorkspacePublished && (
                  <p className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                    Emails will be sent when workspace is published
                  </p>
                )}
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
                      <div className="flex items-center gap-1">
                        {invitation.token && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleCopyLink(invitation)}
                            title="Copy invitation link"
                          >
                            {copiedId === invitation.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              disabled={cancellingId === invitation.id}
                            >
                              {cancellingId === invitation.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel invitation?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel the invitation to{" "}
                                <span className="font-medium">{invitation.email}</span>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep invitation</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancelInvitation(invitation.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Cancel invitation
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleMemberClick(member)}
                    className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {formatRole(member.role)}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Member Details Dialog */}
      <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>
              View and manage member information
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-6">
              {/* Member info */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedMember.image} />
                  <AvatarFallback className="text-lg">
                    {getInitials(selectedMember.name || selectedMember.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedMember.name || "No name"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedMember.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Joined {new Date(selectedMember.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Role management (admin only) */}
              {isAdmin && (
                <div className="space-y-3">
                  <Label>Role</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={editingRole}
                      onValueChange={setEditingRole}
                      disabled={savingRole}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {editingRole !== selectedMember.role && (
                      <Button
                        onClick={handleUpdateRole}
                        disabled={savingRole}
                        size="sm"
                      >
                        {savingRole ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Non-admin view of role */}
              {!isAdmin && (
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(selectedMember.role)}>
                      {formatRole(selectedMember.role)}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCloseMemberDialog}>
              Close
            </Button>
            {isAdmin && selectedMember && (
              <>
                {!showRemoveConfirm ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowRemoveConfirm(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove from Workspace
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Are you sure?</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRemoveConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveMember}
                      disabled={removingMember}
                    >
                      {removingMember ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Remove"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
