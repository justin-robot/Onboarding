"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design/components/ui/table";
import { Button } from "@repo/design/components/ui/button";
import { Badge } from "@repo/design/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design/components/ui/card";
import { Input } from "@repo/design/components/ui/input";
import { Label } from "@repo/design/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design/components/ui/select";
import { SearchIcon, Mail, Trash2, Copy, Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  workspaceId: string;
  workspaceName: string;
  inviterName: string | null;
  inviterEmail: string | null;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
}

interface Workspace {
  id: string;
  name: string;
}

const roleVariants: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  user: "outline",
};

export const InvitationList = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create invitation dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "user">("user");
  const [creating, setCreating] = useState(false);

  const fetchInvitations = async () => {
    try {
      const response = await fetch("/api/admin/invitations", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch invitations");

      const result = await response.json();
      setInvitations(result.data || []);
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchWorkspaces = async () => {
    setWorkspacesLoading(true);
    try {
      const response = await fetch("/api/admin/workspaces?limit=100", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch workspaces");
      const result = await response.json();
      setWorkspaces(result.data || []);
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      toast.error("Failed to load workspaces");
    } finally {
      setWorkspacesLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
    fetchWorkspaces();
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setSelectedWorkspaceId("");
    setInviteEmail("");
    setInviteRole("user");
  };

  const handleCreateInvitation = async () => {
    if (!selectedWorkspaceId) {
      toast.error("Please select a workspace");
      return;
    }
    if (!inviteEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/workspaces/${selectedWorkspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create invitation");
      }

      toast.success("Invitation sent successfully");
      handleCloseCreateDialog();
      fetchInvitations(); // Refresh the list
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invitation");
    } finally {
      setCreating(false);
    }
  };

  const filteredData = searchValue
    ? invitations.filter(
        (invitation) =>
          invitation.email?.toLowerCase().includes(searchValue.toLowerCase()) ||
          invitation.workspaceName?.toLowerCase().includes(searchValue.toLowerCase())
      )
    : invitations;

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/invitations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete invitation");

      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      toast.success("Invitation deleted");
    } catch (error) {
      toast.error("Failed to delete invitation");
    }
  };

  const handleCopyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Invite link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Pending Invitations</h1>
        <p className="text-muted-foreground mt-2">
          View and manage pending workspace invitations
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Pending Invitations</CardTitle>
            </div>
            <Button onClick={handleOpenCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invitation
            </Button>
          </div>
          <div className="mt-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email or workspace..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading invitations...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[20%]">Email</TableHead>
                  <TableHead className="w-[20%]">Workspace</TableHead>
                  <TableHead className="w-[10%]">Role</TableHead>
                  <TableHead className="w-[15%]">Invited By</TableHead>
                  <TableHead className="w-[12%]">Expires</TableHead>
                  <TableHead className="w-[10%]">Status</TableHead>
                  <TableHead className="w-[13%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredData || filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No pending invitations
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((invitation) => (
                    <TableRow key={invitation.id} className={invitation.isExpired ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>{invitation.workspaceName}</TableCell>
                      <TableCell>
                        <Badge variant={roleVariants[invitation.role] || "outline"}>
                          {invitation.role?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{invitation.inviterName || invitation.inviterEmail || "—"}</TableCell>
                      <TableCell>
                        {new Date(invitation.expiresAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        {invitation.isExpired ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : (
                          <Badge variant="default">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyLink(invitation.token, invitation.id)}
                            title="Copy invite link"
                          >
                            {copiedId === invitation.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Delete invitation"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
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
                                  onClick={() => handleDelete(invitation.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Cancel invitation
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Invitation Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Invitation</DialogTitle>
            <DialogDescription>
              Send an invitation to join a workspace. The recipient will receive an email with a link to accept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspace">Workspace</Label>
              <Select
                value={selectedWorkspaceId}
                onValueChange={setSelectedWorkspaceId}
                disabled={workspacesLoading}
              >
                <SelectTrigger id="workspace">
                  <SelectValue placeholder={workspacesLoading ? "Loading..." : "Select a workspace"} />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(value: "admin" | "user") => setInviteRole(value)}
                disabled={creating}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCreateDialog} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreateInvitation} disabled={creating || !selectedWorkspaceId || !inviteEmail}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
