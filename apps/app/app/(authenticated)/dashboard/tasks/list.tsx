"use client";

import { useListContext, ListBase as RaList, useRedirect } from "ra-core";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design/components/ui/select";
import { Eye, SearchIcon, CheckSquare } from "lucide-react";
import { useState } from "react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  workspaceId: string;
  workspaceName: string;
  sectionId: string;
  sectionTitle: string;
  assigneeCount: number;
  dueDateValue: string | null;
  createdAt: string;
}

const taskTypeLabels: Record<string, string> = {
  FORM: "Form",
  ACKNOWLEDGEMENT: "Acknowledgement",
  TIME_BOOKING: "Time Booking",
  E_SIGN: "E-Sign",
  FILE_REQUEST: "File Request",
  APPROVAL: "Approval",
};

const taskTypeColors: Record<string, string> = {
  FORM: "bg-blue-100 text-blue-800",
  ACKNOWLEDGEMENT: "bg-purple-100 text-purple-800",
  TIME_BOOKING: "bg-orange-100 text-orange-800",
  E_SIGN: "bg-green-100 text-green-800",
  FILE_REQUEST: "bg-yellow-100 text-yellow-800",
  APPROVAL: "bg-red-100 text-red-800",
};

const statusColors: Record<string, "default" | "secondary" | "outline"> = {
  not_started: "outline",
  in_progress: "secondary",
  completed: "default",
};

const TaskListInner = () => {
  const { data, isPending, setFilters, filterValues } = useListContext<Task>();
  const redirect = useRedirect();
  const [searchValue, setSearchValue] = useState("");

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  const filteredData = searchValue
    ? data?.filter(
        (task) =>
          task.title?.toLowerCase().includes(searchValue.toLowerCase()) ||
          task.workspaceName?.toLowerCase().includes(searchValue.toLowerCase())
      )
    : data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            <CardTitle>Tasks</CardTitle>
          </div>
        </div>
        <div className="mt-4 flex gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterValues?.status || ""}
            onValueChange={(value) => setFilters({ ...filterValues, status: value || undefined })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterValues?.type || ""}
            onValueChange={(value) => setFilters({ ...filterValues, type: value || undefined })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              <SelectItem value="FORM">Form</SelectItem>
              <SelectItem value="ACKNOWLEDGEMENT">Acknowledgement</SelectItem>
              <SelectItem value="TIME_BOOKING">Time Booking</SelectItem>
              <SelectItem value="E_SIGN">E-Sign</SelectItem>
              <SelectItem value="FILE_REQUEST">File Request</SelectItem>
              <SelectItem value="APPROVAL">Approval</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Assignees</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredData || filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="font-medium max-w-xs truncate">{task.title}</div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${taskTypeColors[task.type] || "bg-gray-100"}`}>
                      {taskTypeLabels[task.type] || task.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[task.status] || "outline"}>
                      {task.status?.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{task.workspaceName}</TableCell>
                  <TableCell className="max-w-xs truncate">{task.sectionTitle}</TableCell>
                  <TableCell>{task.assigneeCount}</TableCell>
                  <TableCell>
                    {task.dueDateValue
                      ? new Date(task.dueDateValue).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => redirect("show", "tasks", task.id)}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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

export const TaskList = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <p className="text-muted-foreground mt-2">
          View all tasks across all workspaces
        </p>
      </div>
      <RaList>
        <TaskListInner />
      </RaList>
    </div>
  );
};
