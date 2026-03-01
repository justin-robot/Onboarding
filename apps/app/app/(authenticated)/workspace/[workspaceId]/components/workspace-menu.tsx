"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design/components/ui/dropdown-menu";
import { Button } from "@repo/design/components/ui/button";
import {
  MoreHorizontal,
  Plus,
  FolderPlus,
  Users,
  Zap,
} from "lucide-react";

interface WorkspaceMenuProps {
  isAdmin: boolean;
  onAddSection: () => void;
  onAddTask: () => void;
  onMembers: () => void;
}

export function WorkspaceMenu({
  isAdmin,
  onAddSection,
  onAddTask,
  onMembers,
}: WorkspaceMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {isAdmin && (
          <>
            <DropdownMenuItem onClick={() => { onAddSection(); setOpen(false); }}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Section
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onAddTask(); setOpen(false); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Action
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => { onMembers(); setOpen(false); }}>
          <Users className="mr-2 h-4 w-4" />
          Members
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Zap className="mr-2 h-4 w-4" />
              Automations & Events
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
