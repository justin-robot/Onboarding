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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design/components/ui/select";
import { FileText, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AuditLog {
  id: string;
  eventType: string;
  metadata: Record<string, any> | null;
  source: string | null;
  ipAddress: string | null;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
  taskId: string | null;
  taskTitle: string | null;
  createdAt: string;
}

const eventTypeColors: Record<string, string> = {
  "workspace.created": "bg-green-100 text-green-800",
  "workspace.updated": "bg-blue-100 text-blue-800",
  "workspace.deleted": "bg-red-100 text-red-800",
  "workspace.member_added": "bg-purple-100 text-purple-800",
  "task.created": "bg-green-100 text-green-800",
  "task.updated": "bg-blue-100 text-blue-800",
  "task.completed": "bg-green-100 text-green-800",
  "task.assigned": "bg-purple-100 text-purple-800",
  "form.submitted": "bg-blue-100 text-blue-800",
  "approval.approved": "bg-green-100 text-green-800",
  "approval.rejected": "bg-red-100 text-red-800",
  "file.uploaded": "bg-yellow-100 text-yellow-800",
  "comment.added": "bg-gray-100 text-gray-800",
  "message.sent": "bg-gray-100 text-gray-800",
};

export const AuditLogList = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch("/api/admin/audit-logs", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch audit logs");

        const result = await response.json();
        setLogs(result.data || []);
      } catch (error) {
        console.error("Error fetching audit logs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  let filteredData = logs;

  if (eventTypeFilter) {
    filteredData = filteredData.filter((log) => log.eventType === eventTypeFilter);
  }

  if (sourceFilter) {
    filteredData = filteredData.filter((log) => log.source === sourceFilter);
  }

  // Extract unique event types from data
  const eventTypes = Array.from(new Set(logs.map((log) => log.eventType))).sort();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">
          View system activity and audit trail
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Audit Logs</CardTitle>
            </div>
          </div>
          <div className="mt-4 flex gap-4">
            <Select value={eventTypeFilter || "all"} onValueChange={(v) => setEventTypeFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder="All event types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event types</SelectItem>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter || "all"} onValueChange={(v) => setSourceFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="signnow">SignNow</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading audit logs...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredData || filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${eventTypeColors[log.eventType] || "bg-gray-100 text-gray-800"}`}>
                          {log.eventType}
                        </span>
                      </TableCell>
                      <TableCell>
                        {log.actorName || log.actorEmail || (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.workspaceName || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.taskTitle || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.source ? (
                          <Badge variant="outline">{log.source}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
