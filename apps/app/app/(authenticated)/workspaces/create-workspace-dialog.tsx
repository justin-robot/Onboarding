"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@repo/design/components/ui/button";
import { Input } from "@repo/design/components/ui/input";
import { Textarea } from "@repo/design/components/ui/textarea";
import { Calendar } from "@repo/design/components/ui/calendar";
import { Badge } from "@repo/design/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@repo/design/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design/components/ui/popover";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { cn } from "@repo/design/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface FormData {
  name: string;
  description: string;
  dueDate: Date | null;
}

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
}: CreateWorkspaceDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const form = useForm<FormData>({
    defaultValues: {
      name: "",
      description: "",
      dueDate: null,
    },
  });

  const validateAndAddEmail = useCallback((email: string) => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) return;

    // Validate email format
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    // Check for self-invite
    if (userEmail && trimmedEmail === userEmail.toLowerCase()) {
      setEmailError("You cannot invite yourself");
      return;
    }

    // Check for duplicates
    if (inviteEmails.includes(trimmedEmail)) {
      setEmailError("This email has already been added");
      return;
    }

    setInviteEmails(prev => [...prev, trimmedEmail]);
    setEmailInput("");
    setEmailError(null);
  }, [inviteEmails, userEmail]);

  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      validateAndAddEmail(emailInput);
    } else if (e.key === "Backspace" && !emailInput && inviteEmails.length > 0) {
      // Remove last email when backspace is pressed on empty input
      setInviteEmails(prev => prev.slice(0, -1));
    }
  };

  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Handle paste with commas
    if (value.includes(",")) {
      const emails = value.split(",");
      emails.forEach(email => validateAndAddEmail(email));
    } else {
      setEmailInput(value);
      setEmailError(null);
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setInviteEmails(prev => prev.filter(email => email !== emailToRemove));
  };

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          dueDate: data.dueDate?.toISOString() || null,
          inviteEmails: inviteEmails.length > 0 ? inviteEmails : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create workspace");
      }

      const result = await response.json();

      // Show success message with invitation results
      if (result.invitationResults) {
        const { created, failed } = result.invitationResults;
        if (created > 0 && failed === 0) {
          toast.success(`Workspace created with ${created} pending invitation${created > 1 ? "s" : ""}. Emails will be sent when you publish.`);
        } else if (created > 0 && failed > 0) {
          toast.success(`Workspace created. ${created} invitation${created > 1 ? "s" : ""} pending, ${failed} failed`);
        } else if (failed > 0) {
          toast.warning(`Workspace created but some invitations failed`);
        } else {
          toast.success("Workspace created successfully");
        }
      } else {
        toast.success("Workspace created successfully");
      }

      form.reset();
      setInviteEmails([]);
      setEmailInput("");
      onOpenChange(false);
      router.push(`/workspace/${result.workspace.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create workspace"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>
            Create a new workspace to manage your client onboarding workflow.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Client workspace name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this workspace"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date (optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Invite Members */}
            <div className="space-y-2">
              <FormLabel>Invite Members (optional)</FormLabel>
              <div
                className={cn(
                  "flex flex-wrap gap-2 rounded-md border bg-background px-3 py-2 min-h-[42px]",
                  emailError && "border-destructive"
                )}
              >
                {inviteEmails.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="ml-1 rounded-full hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  type="email"
                  placeholder={inviteEmails.length === 0 ? "colleague@example.com" : "Add another..."}
                  value={emailInput}
                  onChange={handleEmailInputChange}
                  onKeyDown={handleEmailInputKeyDown}
                  onBlur={() => emailInput && validateAndAddEmail(emailInput)}
                  className="flex-1 min-w-[150px] border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isSubmitting}
                />
              </div>
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
              <FormDescription>
                Invitation emails will be sent when you publish the workspace
              </FormDescription>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Workspace
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
