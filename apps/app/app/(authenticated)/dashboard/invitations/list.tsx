"use client";

import { useListContext, ListBase as RaList, useDelete, useRefresh } from "ra-core";
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
import { SearchIcon, Mail, Trash2, Copy, Check } from "lucide-react";
import { useState } from "react";
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

const InvitationListInner = () => {
  const { data, isPending } = useListContext<Invitation>();
  const [deleteOne] = useDelete();
  const refresh = useRefresh();
  const [searchValue, setSearchValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading invitations...</p>
      </div>
    );
  }

  const filteredData = searchValue
    ? data?.filter(
        (invitation) =>
          invitation.email?.toLowerCase().includes(searchValue.toLowerCase()) ||
          invitation.workspaceName?.toLowerCase().includes(searchValue.toLowerCase())
      )
    : data;

  const handleDelete = async (id: string) => {
    try {
      await deleteOne("invitations", { id });
      refresh();
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Invited By</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
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
      </CardContent>
    </Card>
  );
};

export const InvitationList = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Pending Invitations</h1>
        <p className="text-muted-foreground mt-2">
          View and manage pending workspace invitations
        </p>
      </div>
      <RaList>
        <InvitationListInner />
      </RaList>
    </div>
  );
};
