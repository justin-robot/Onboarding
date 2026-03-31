"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design/components/ui/dialog";
import { Button } from "@repo/design/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design/components/ui/select";
import { Label } from "@repo/design/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
}

interface AddToWorkspaceDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddToWorkspaceDialog = ({
  userId,
  open,
  onOpenChange,
  onSuccess,
}: AddToWorkspaceDialogProps) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [role, setRole] = useState<"member" | "manager">("member");

  useEffect(() => {
    if (open) {
      setLoading(true);
      setSelectedWorkspaceId("");
      setRole("member");
      fetch(`/api/admin/users/${userId}/available-workspaces`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => setWorkspaces(data.data || []))
        .catch(() => {
          toast.error("Failed to load workspaces");
          setWorkspaces([]);
        })
        .finally(() => setLoading(false));
    }
  }, [open, userId]);

  const handleAdd = async () => {
    if (!selectedWorkspaceId) {
      toast.error("Please select a workspace");
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ workspaceId: selectedWorkspaceId, role }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to add user to workspace");
      }

      toast.success("User added to workspace");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add user to workspace"
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Workspace</DialogTitle>
          <DialogDescription>
            Add this user to a workspace they are not currently a member of.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Loading workspaces...
            </span>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No available workspaces to add this user to.
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspace">Workspace</Label>
              <Select
                value={selectedWorkspaceId}
                onValueChange={setSelectedWorkspaceId}
              >
                <SelectTrigger id="workspace">
                  <SelectValue placeholder="Select a workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as "member" | "manager")}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={adding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={adding || loading || workspaces.length === 0 || !selectedWorkspaceId}
          >
            {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add to Workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
