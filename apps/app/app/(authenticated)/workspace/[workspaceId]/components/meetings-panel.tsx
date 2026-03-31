"use client";

import { useState, useEffect, useCallback } from "react";
import { format, isToday, isTomorrow, isThisWeek, parseISO } from "date-fns";
import {
  Calendar,
  Clock,
  ExternalLink,
  Video,
  Users,
  Plus,
  RefreshCw,
  AlertCircle,
  Link2,
} from "lucide-react";
import { Button } from "@repo/design/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design/components/ui/dialog";
import { Input } from "@repo/design/components/ui/input";
import { Label } from "@repo/design/components/ui/label";
import { Textarea } from "@repo/design/components/ui/textarea";
import { ScrollArea } from "@repo/design/components/ui/scroll-area";
import { Skeleton } from "@repo/design/components/ui/skeleton";
import { Badge } from "@repo/design/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/design/components/ui/tooltip";
import { cn } from "@repo/design/lib/utils";
import { toast } from "sonner";

interface Meeting {
  id: string;
  summary: string;
  description: string | null;
  start: string;
  end: string;
  meetLink: string | null;
  attendees: string[];
  htmlLink: string;
}

interface MeetingsPanelProps {
  workspaceId: string;
  onClose?: () => void;
  /** Hide the header when embedded in another component (e.g., ChatPanel tabs) */
  hideHeader?: boolean;
}

// Group meetings by date category
function groupMeetingsByDate(meetings: Meeting[]): Map<string, Meeting[]> {
  const groups = new Map<string, Meeting[]>();

  for (const meeting of meetings) {
    const date = parseISO(meeting.start);
    let key: string;

    if (isToday(date)) {
      key = "Today";
    } else if (isTomorrow(date)) {
      key = "Tomorrow";
    } else if (isThisWeek(date)) {
      key = format(date, "EEEE"); // Day name
    } else {
      key = format(date, "MMMM d, yyyy");
    }

    const existing = groups.get(key) || [];
    existing.push(meeting);
    groups.set(key, existing);
  }

  return groups;
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const startDate = parseISO(meeting.start);
  const endDate = parseISO(meeting.end);
  const isNow =
    new Date() >= startDate && new Date() <= endDate;

  return (
    <Card className={cn("transition-colors", isNow && "border-green-500 bg-green-500/5")}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-tight">
            {meeting.summary || "Untitled Meeting"}
          </CardTitle>
          {isNow && (
            <Badge variant="default" className="bg-green-500 text-xs">
              Live
            </Badge>
          )}
        </div>
        <CardDescription className="flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {meeting.description && (
          <p className="mb-3 text-xs text-muted-foreground line-clamp-2">
            {meeting.description}
          </p>
        )}

        {meeting.attendees.length > 0 && (
          <div className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>
              {meeting.attendees.length} attendee
              {meeting.attendees.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          {meeting.meetLink && (
            <Button size="sm" variant="default" className="flex-1" asChild>
              <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer">
                <Video className="mr-1 h-3 w-3" />
                Join Meet
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <a href={meeting.htmlLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateMeetingDialog({
  workspaceId,
  onMeetingCreated,
}: {
  workspaceId: string;
  onMeetingCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [attendees, setAttendees] = useState("");

  const handleCreate = async () => {
    if (!title || !date || !startTime || !endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);

    try {
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      if (endDateTime <= startDateTime) {
        toast.error("End time must be after start time");
        setIsCreating(false);
        return;
      }

      const attendeeList = attendees
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      const response = await fetch(`/api/workspaces/${workspaceId}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          attendees: attendeeList.length > 0 ? attendeeList : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create meeting");
      }

      const data = await response.json();
      toast.success("Meeting created successfully");

      if (data.meetLink) {
        toast.info(
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span>Google Meet link generated</span>
          </div>
        );
      }

      // Reset form
      setTitle("");
      setDescription("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setAttendees("");
      setOpen(false);
      onMeetingCreated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create meeting"
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Set default date to today
  useEffect(() => {
    if (open && !date) {
      setDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [open, date]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          New Meeting
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Meeting</DialogTitle>
          <DialogDescription>
            Create a new meeting with Google Meet link
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Meeting title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Meeting description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="attendees">Attendees</Label>
            <Input
              id="attendees"
              placeholder="email1@example.com, email2@example.com"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated email addresses (optional)
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MeetingsPanel({ workspaceId, onClose, hideHeader = false }: MeetingsPanelProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [connectedAccountEmail, setConnectedAccountEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First check if Google Calendar is connected
      const integrationsResponse = await fetch(
        `/api/workspaces/${workspaceId}/integrations`
      );

      if (!integrationsResponse.ok) {
        throw new Error("Failed to check integrations");
      }

      const integrations = await integrationsResponse.json();
      const calendarConnected = integrations.google_calendar?.connected;
      setIsConnected(calendarConnected);
      setConnectedAccountEmail(integrations.google_calendar?.accountEmail || null);

      if (!calendarConnected) {
        setIsLoading(false);
        return;
      }

      // Fetch meetings
      const response = await fetch(
        `/api/workspaces/${workspaceId}/meetings?maxResults=50`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch meetings");
      }

      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (err) {
      console.error("Failed to fetch meetings:", err);
      setError(err instanceof Error ? err.message : "Failed to load meetings");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleConnectCalendar = () => {
    // Navigate to Google OAuth flow in the same window
    // The callback will redirect back to this workspace with success/error params
    window.location.href = `/api/workspaces/${workspaceId}/integrations/google/connect`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {!hideHeader && (
          <div className="flex-shrink-0 flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-lg font-semibold">Meetings</h2>
          </div>
        )}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Not connected state
  if (isConnected === false) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {!hideHeader && (
          <div className="flex-shrink-0 flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-lg font-semibold">Meetings</h2>
          </div>
        )}
        <div className="flex flex-1 min-h-0 flex-col items-center justify-center p-6 text-center overflow-auto">
          <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">Connect Google Calendar</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Connect your Google Calendar to view and create meetings with Google
            Meet links.
          </p>
          <Button onClick={handleConnectCalendar}>
            <Calendar className="mr-2 h-4 w-4" />
            Connect Google Calendar
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {!hideHeader && (
          <div className="flex-shrink-0 flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-lg font-semibold">Meetings</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={fetchMeetings}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh meetings</TooltipContent>
            </Tooltip>
          </div>
        )}
        <div className="flex flex-1 min-h-0 flex-col items-center justify-center p-6 text-center overflow-auto">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="mb-2 text-lg font-medium">Failed to load meetings</h3>
          <p className="mb-6 text-sm text-muted-foreground">{error}</p>
          <Button onClick={fetchMeetings}>Try Again</Button>
        </div>
      </div>
    );
  }

  const groupedMeetings = groupMeetingsByDate(meetings);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {!hideHeader && (
        <div className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-lg font-semibold">Meetings</h2>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={fetchMeetings}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh meetings</TooltipContent>
              </Tooltip>
              <CreateMeetingDialog
                workspaceId={workspaceId}
                onMeetingCreated={fetchMeetings}
              />
            </div>
          </div>
          {connectedAccountEmail && (
            <div className="px-4 pb-3 -mt-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                Connected to {connectedAccountEmail}
              </p>
            </div>
          )}
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          {meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Video className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">No upcoming meetings</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Schedule a meeting to get started
              </p>
              <CreateMeetingDialog
                workspaceId={workspaceId}
                onMeetingCreated={fetchMeetings}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Action buttons and connected account info when header is hidden */}
              {hideHeader && (
                <div className="space-y-2">
                  {connectedAccountEmail && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      Connected to {connectedAccountEmail}
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" onClick={fetchMeetings}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refresh meetings</TooltipContent>
                    </Tooltip>
                    <CreateMeetingDialog
                      workspaceId={workspaceId}
                      onMeetingCreated={fetchMeetings}
                    />
                  </div>
                </div>
              )}
              {Array.from(groupedMeetings.entries()).map(([dateLabel, dateMeetings]) => (
                <div key={dateLabel}>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                    {dateLabel}
                  </h3>
                  <div className="space-y-3">
                    {dateMeetings.map((meeting) => (
                      <MeetingCard key={meeting.id} meeting={meeting} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
