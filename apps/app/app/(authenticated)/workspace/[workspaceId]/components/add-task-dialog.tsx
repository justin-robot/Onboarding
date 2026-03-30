"use client";

import { useState } from "react";
import { Button } from "@repo/design/components/ui/button";
import { Input } from "@repo/design/components/ui/input";
import { Label } from "@repo/design/components/ui/label";
import { Textarea } from "@repo/design/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@repo/design/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design/components/ui/popover";
import { Calendar as CalendarPicker } from "@repo/design/components/ui/calendar";
import { ScrollArea } from "@repo/design/components/ui/scroll-area";
import { Checkbox } from "@repo/design/components/ui/checkbox";
import { Badge } from "@repo/design/components/ui/badge";
import { format } from "date-fns";
import {
  FileText,
  CheckSquare,
  Upload,
  ThumbsUp,
  Calendar,
  FileSignature,
  Loader2,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/design/lib/utils";

// Task type definitions with colors matching task-card.tsx
const TASK_TYPES = [
  {
    value: "APPROVAL",
    label: "Approval",
    icon: ThumbsUp,
    color: "bg-blue-600",
    iconColor: "text-white"
  },
  {
    value: "ACKNOWLEDGEMENT",
    label: "Acknowledgement",
    icon: CheckSquare,
    color: "bg-amber-600",
    iconColor: "text-white"
  },
  {
    value: "FILE_REQUEST",
    label: "File Request",
    icon: Upload,
    color: "bg-purple-600",
    iconColor: "text-white"
  },
  {
    value: "E_SIGN",
    label: "E-Sign",
    icon: FileSignature,
    color: "bg-indigo-600",
    iconColor: "text-white"
  },
  {
    value: "TIME_BOOKING",
    label: "Time Booking",
    icon: Calendar,
    color: "bg-orange-600",
    iconColor: "text-white"
  },
  {
    value: "FORM",
    label: "Form",
    icon: FileText,
    color: "bg-teal-600",
    iconColor: "text-white"
  },
] as const;

type TaskType = typeof TASK_TYPES[number]["value"];

// Map frontend task types to display icons (colors matching task-card.tsx)
const TASK_TYPE_ICONS: Record<string, { icon: typeof FileText; color: string }> = {
  form: { icon: FileText, color: "bg-teal-600" },
  acknowledgement: { icon: CheckSquare, color: "bg-amber-600" },
  file_upload: { icon: Upload, color: "bg-purple-600" },
  approval: { icon: ThumbsUp, color: "bg-blue-600" },
  booking: { icon: Calendar, color: "bg-orange-600" },
  esign: { icon: FileSignature, color: "bg-indigo-600" },
};

interface Task {
  id: string;
  title: string;
  type: "form" | "acknowledgement" | "file_upload" | "approval" | "booking" | "esign";
  position: number;
  isCompleted: boolean;
  isLocked: boolean;
}

interface Section {
  id: string;
  title: string;
  tasks: Task[];
}

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
}

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: Section[];
  members: Member[];
  pendingInvitations?: PendingInvitation[];
  onTaskCreated: () => void;
  workspaceId: string;
}

type Step = "type" | "position" | "details";

export function AddTaskDialog({
  open,
  onOpenChange,
  sections,
  members,
  pendingInvitations = [],
  onTaskCreated,
  workspaceId,
}: AddTaskDialogProps) {
  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<TaskType | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number>(0);
  const [creating, setCreating] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedInviteeEmails, setSelectedInviteeEmails] = useState<string[]>([]);

  const handleTypeSelect = (type: TaskType) => {
    setSelectedType(type);
    setStep("position");
  };

  const handlePositionSelect = (sectionId: string, position: number) => {
    setSelectedSectionId(sectionId);
    setSelectedPosition(position);
    setStep("details");
  };

  const handleBack = () => {
    if (step === "details") {
      setStep("position");
    } else if (step === "position") {
      setStep("type");
    }
  };

  const handleSubmit = async () => {
    if (!selectedType || !selectedSectionId) return;

    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(`/api/sections/${selectedSectionId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          type: selectedType,
          position: selectedPosition,
          assigneeIds: selectedAssignees,
          assigneeEmails: selectedInviteeEmails,
          dueDateType: dueDate ? "absolute" : undefined,
          dueDateValue: dueDate ? dueDate.toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create task");
      }

      toast.success("Task created");
      handleClose();
      onTaskCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setStep("type");
    setSelectedType(null);
    setSelectedSectionId(null);
    setSelectedPosition(0);
    setTitle("");
    setDescription("");
    setDueDate(undefined);
    setSelectedAssignees([]);
    setSelectedInviteeEmails([]);
    onOpenChange(false);
  };

  const getStepTitle = () => {
    switch (step) {
      case "type":
        return "Add New Action";
      case "position":
        return "Add New Action";
      case "details":
        const typeInfo = TASK_TYPES.find(t => t.value === selectedType);
        return `New ${typeInfo?.label || "Task"}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            {(step === "position" || step === "details") && (
              <button
                onClick={handleBack}
                className="p-1 hover:bg-muted rounded-md transition-colors"
                disabled={creating}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <DialogTitle className="text-lg font-semibold">{getStepTitle()}</DialogTitle>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-muted rounded-md transition-colors"
            disabled={creating}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {step === "type" && (
          <TypeSelectionStep onSelect={handleTypeSelect} />
        )}
        {step === "position" && (
          <PositionSelectionStep
            sections={sections}
            selectedType={selectedType!}
            onSelectPosition={handlePositionSelect}
          />
        )}
        {step === "details" && (
          <DetailsStep
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            dueDate={dueDate}
            setDueDate={setDueDate}
            selectedAssignees={selectedAssignees}
            setSelectedAssignees={setSelectedAssignees}
            selectedInviteeEmails={selectedInviteeEmails}
            setSelectedInviteeEmails={setSelectedInviteeEmails}
            members={members}
            pendingInvitations={pendingInvitations}
            creating={creating}
            onSubmit={handleSubmit}
            onCancel={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Step 1: Type Selection
function TypeSelectionStep({ onSelect }: { onSelect: (type: TaskType) => void }) {
  return (
    <div className="py-2">
      {TASK_TYPES.map((type) => {
        const Icon = type.icon;
        return (
          <button
            key={type.value}
            onClick={() => onSelect(type.value)}
            className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-muted/50 transition-colors text-left group"
          >
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center",
              type.color
            )}>
              <Icon className={cn("h-5 w-5", type.iconColor)} />
            </div>
            <span className="flex-1 font-medium">{type.label}</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        );
      })}
    </div>
  );
}

// Step 2: Position Selection
function PositionSelectionStep({
  sections,
  selectedType,
  onSelectPosition,
}: {
  sections: Section[];
  selectedType: TaskType;
  onSelectPosition: (sectionId: string, position: number) => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="px-6 py-4">
        <h3 className="text-xl font-semibold">Select a position</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Please select where you want to add this new action.
        </p>
      </div>

      <ScrollArea className="max-h-[400px]">
        <div className="px-6 pb-6 space-y-4">
          {sections.map((section) => (
            <div key={section.id} className="border rounded-lg overflow-hidden">
              {/* Section header */}
              <div className="bg-muted/30 px-4 py-2.5 border-b">
                <span className="font-medium text-sm">{section.title}</span>
              </div>

              {/* Tasks and add buttons */}
              <div className="divide-y">
                {/* Add at beginning */}
                <AddHereButton
                  onClick={() => onSelectPosition(section.id, 0)}
                />

                {section.tasks
                  .sort((a, b) => a.position - b.position)
                  .map((task, index) => (
                    <div key={task.id}>
                      {/* Task row */}
                      <TaskRow task={task} stepNumber={index + 1} />

                      {/* Add after this task */}
                      <AddHereButton
                        onClick={() => onSelectPosition(section.id, task.position + 1)}
                      />
                    </div>
                  ))}

                {section.tasks.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                    No tasks yet
                  </div>
                )}
              </div>
            </div>
          ))}

          {sections.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No sections available. Create a section first.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Step 3: Task Details
function DetailsStep({
  title,
  setTitle,
  description,
  setDescription,
  dueDate,
  setDueDate,
  selectedAssignees,
  setSelectedAssignees,
  selectedInviteeEmails,
  setSelectedInviteeEmails,
  members,
  pendingInvitations,
  creating,
  onSubmit,
  onCancel,
}: {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  dueDate: Date | undefined;
  setDueDate: (value: Date | undefined) => void;
  selectedAssignees: string[];
  setSelectedAssignees: (value: string[]) => void;
  selectedInviteeEmails: string[];
  setSelectedInviteeEmails: (value: string[]) => void;
  members: Member[];
  pendingInvitations: PendingInvitation[];
  creating: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="px-6 py-4 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Enter task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={creating}
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">
            Description <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Add more details about this task..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={creating}
            rows={3}
          />
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date <span className="text-muted-foreground">(optional)</span>
            </div>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dueDate && "text-muted-foreground"
                )}
                disabled={creating}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, "PPP") : "Select due date"}
                {dueDate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDueDate(undefined);
                    }}
                    className="ml-auto hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Assignees */}
        <div className="space-y-2">
          <Label>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assignees
            </div>
          </Label>
          {(selectedAssignees.length > 0 || selectedInviteeEmails.length > 0) && (
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedAssignees.map((userId) => {
                const member = members.find((m) => m.userId === userId);
                return (
                  <Badge
                    key={userId}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {member?.name || member?.email || "Unknown"}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAssignees(
                          selectedAssignees.filter((id) => id !== userId)
                        )
                      }
                      className="ml-1 hover:text-destructive"
                      disabled={creating}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
              {selectedInviteeEmails.map((email) => (
                <Badge
                  key={email}
                  variant="outline"
                  className="flex items-center gap-1 border-yellow-500 text-yellow-700"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedInviteeEmails(
                        selectedInviteeEmails.filter((e) => e !== email)
                      )
                    }
                    className="ml-1 hover:text-destructive"
                    disabled={creating}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <ScrollArea className="h-[160px] rounded-md border p-2">
            <div className="space-y-2">
              {members.length === 0 && pendingInvitations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No members or invitees available
                </p>
              ) : (
                <>
                  {/* Workspace Members */}
                  {members.length > 0 && (
                    <>
                      <div className="text-xs font-medium text-muted-foreground px-1 pt-1">
                        Workspace Members
                      </div>
                      {members.map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`assignee-${member.userId}`}
                            checked={selectedAssignees.includes(member.userId)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAssignees([...selectedAssignees, member.userId]);
                              } else {
                                setSelectedAssignees(
                                  selectedAssignees.filter((id) => id !== member.userId)
                                );
                              }
                            }}
                            disabled={creating}
                          />
                          <label
                            htmlFor={`assignee-${member.userId}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            <span>{member.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {member.email}
                            </span>
                          </label>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Pending Invitations */}
                  {pendingInvitations.length > 0 && (
                    <>
                      <div className="text-xs font-medium text-muted-foreground px-1 pt-2">
                        Pending Invitations
                      </div>
                      {pendingInvitations.map((invitee) => (
                        <div
                          key={invitee.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`invitee-${invitee.id}`}
                            checked={selectedInviteeEmails.includes(invitee.email)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedInviteeEmails([...selectedInviteeEmails, invitee.email]);
                              } else {
                                setSelectedInviteeEmails(
                                  selectedInviteeEmails.filter((e) => e !== invitee.email)
                                );
                              }
                            }}
                            disabled={creating}
                          />
                          <label
                            htmlFor={`invitee-${invitee.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 flex items-center gap-2"
                          >
                            <span>{invitee.email}</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-yellow-500 text-yellow-700">
                              Invited
                            </Badge>
                          </label>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={creating}
        >
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={creating || !title.trim()}>
          {creating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Task"
          )}
        </Button>
      </div>
    </div>
  );
}

// Task row component
function TaskRow({ task, stepNumber }: { task: Task; stepNumber: number }) {
  const typeInfo = TASK_TYPE_ICONS[task.type] || TASK_TYPE_ICONS.form;
  const Icon = typeInfo.icon;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Step number */}
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
        task.isCompleted
          ? "bg-green-500 text-white"
          : task.isLocked
            ? "bg-muted text-muted-foreground"
            : "bg-blue-500 text-white"
      )}>
        {task.isCompleted ? "✓" : stepNumber}
      </div>

      {/* Task icon */}
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center",
        typeInfo.color
      )}>
        <Icon className="h-5 w-5 text-white" />
      </div>

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{task.title}</div>
        <div className="text-xs text-muted-foreground">
          {task.isCompleted ? "Completed" : task.isLocked ? "Locked" : "In Progress"}
        </div>
      </div>
    </div>
  );
}

// Add here button
function AddHereButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 py-2.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-sm font-medium"
    >
      <Plus className="h-4 w-4" />
      Add here
    </button>
  );
}
