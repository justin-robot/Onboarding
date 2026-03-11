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
import { Badge } from "@repo/design/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design/components/ui/card";
import { Input } from "@repo/design/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design/components/ui/select";
import { SearchIcon, UserPlus, Loader2 } from "lucide-react";

interface Member {
  id: string;
  role: string;
  userId: string;
  userName: string;
  userEmail: string;
  workspaceId: string;
  workspaceName: string;
  createdAt: string;
}

const roleVariants: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  account_manager: "secondary",
  user: "outline",
};

export const MemberList = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch("/api/admin/members", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch members");

        const result = await response.json();
        setMembers(result.data || []);
      } catch (error) {
        console.error("Error fetching members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  let filteredData = members;

  if (searchValue) {
    filteredData = filteredData.filter(
      (member) =>
        member.userName?.toLowerCase().includes(searchValue.toLowerCase()) ||
        member.userEmail?.toLowerCase().includes(searchValue.toLowerCase()) ||
        member.workspaceName?.toLowerCase().includes(searchValue.toLowerCase())
    );
  }

  if (roleFilter) {
    filteredData = filteredData.filter((member) => member.role === roleFilter);
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Workspace Members</h1>
        <p className="text-muted-foreground mt-2">
          View all workspace memberships across the system
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              <CardTitle>Workspace Members</CardTitle>
            </div>
          </div>
          <div className="mt-4 flex gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or workspace..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter || "all"} onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="account_manager">Account Manager</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading members...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[20%]">User</TableHead>
                  <TableHead className="w-[25%]">Email</TableHead>
                  <TableHead className="w-[25%]">Workspace</TableHead>
                  <TableHead className="w-[15%]">Role</TableHead>
                  <TableHead className="w-[15%]">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredData || filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.userName}</TableCell>
                      <TableCell>{member.userEmail}</TableCell>
                      <TableCell>{member.workspaceName}</TableCell>
                      <TableCell>
                        <Badge variant={roleVariants[member.role] || "outline"}>
                          {member.role?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(member.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
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
