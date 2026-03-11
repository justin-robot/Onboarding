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
import { SearchIcon, Mail, Trash2, Copy, Check, Loader2 } from "lucide-react";
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

const roleVariants: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  account_manager: "secondary",
  user: "outline",
};

export const InvitationList = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(invitation.id)}
                            title="Delete invitation"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
    </div>
  );
};
