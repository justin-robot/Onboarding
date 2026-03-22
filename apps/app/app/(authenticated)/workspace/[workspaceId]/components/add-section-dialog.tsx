"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/design/components/ui/button";
import { Input } from "@repo/design/components/ui/input";
import { Label } from "@repo/design/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@repo/design/components/ui/dialog";
import { ScrollArea } from "@repo/design/components/ui/scroll-area";
import {
  Loader2,
  ChevronLeft,
  X,
  Plus,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/design/lib/utils";

interface Section {
  id: string;
  title: string;
  position: number;
  taskCount?: number;
}

interface AddSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  sections: Section[];
  onSectionCreated?: (sectionId?: string) => void;
}

type Step = "details" | "position";

export function AddSectionDialog({
  open,
  onOpenChange,
  workspaceId,
  sections,
  onSectionCreated,
}: AddSectionDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [title, setTitle] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<number>(sections.length);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedSections = [...sections].sort((a, b) => a.position - b.position);

  const handleNext = () => {
    if (!title.trim()) {
      toast.error("Please enter a section title");
      return;
    }
    setStep("position");
  };

  const handleBack = () => {
    setStep("details");
  };

  const handlePositionSelect = async (position: number) => {
    setSelectedPosition(position);
    await handleSubmit(position);
  };

  const handleSubmit = async (position: number) => {
    if (!title.trim()) {
      toast.error("Please enter a section title");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          position: position,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create section");
      }

      const newSection = await response.json();
      toast.success("Section created successfully");
      handleClose();
      onSectionCreated?.(newSection.id);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create section"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep("details");
    setTitle("");
    setSelectedPosition(sections.length);
    onOpenChange(false);
  };

  const getStepTitle = () => {
    switch (step) {
      case "details":
        return "Add New Section";
      case "position":
        return "Add New Section";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            {step === "position" && (
              <button
                onClick={handleBack}
                className="p-1 hover:bg-muted rounded-md transition-colors"
                disabled={isSubmitting}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <DialogTitle className="text-lg font-semibold">{getStepTitle()}</DialogTitle>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-muted rounded-md transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {step === "details" && (
          <DetailsStep
            title={title}
            setTitle={setTitle}
            onNext={handleNext}
            onCancel={handleClose}
          />
        )}
        {step === "position" && (
          <PositionSelectionStep
            sections={sortedSections}
            onSelectPosition={handlePositionSelect}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Step 1: Section Details
function DetailsStep({
  title,
  setTitle,
  onNext,
  onCancel,
}: {
  title: string;
  setTitle: (value: string) => void;
  onNext: () => void;
  onCancel: () => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && title.trim()) {
      e.preventDefault();
      onNext();
    }
  };

  return (
    <div className="flex flex-col">
      <div className="px-6 py-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="section-title">Section Title</Label>
          <Input
            id="section-title"
            placeholder="e.g., Getting Started"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button onClick={onNext} disabled={!title.trim()}>
          Next
        </Button>
      </div>
    </div>
  );
}

// Step 2: Position Selection
function PositionSelectionStep({
  sections,
  onSelectPosition,
  isSubmitting,
}: {
  sections: Section[];
  onSelectPosition: (position: number) => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className="px-6 py-4">
        <h3 className="text-xl font-semibold">Select a position</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Please select where you want to add this new section.
        </p>
      </div>

      {isSubmitting ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="px-6 pb-6">
            <div className="border rounded-lg overflow-hidden">
              {/* Add at beginning */}
              <AddHereButton
                onClick={() => onSelectPosition(0)}
                label="Add at beginning"
              />

              {sections.map((section, index) => (
                <div key={section.id}>
                  {/* Section row */}
                  <SectionRow section={section} index={index + 1} />

                  {/* Add after this section */}
                  <AddHereButton
                    onClick={() => onSelectPosition(index + 1)}
                    label={index === sections.length - 1 ? "Add at end" : undefined}
                  />
                </div>
              ))}

              {sections.length === 0 && (
                <div className="px-4 py-8 text-sm text-muted-foreground text-center">
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No sections yet</p>
                  <p className="text-xs mt-1">Your new section will be the first one</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// Section row component
function SectionRow({ section, index }: { section: Section; index: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-muted/20">
      {/* Position number */}
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
        {index}
      </div>

      {/* Section icon */}
      <div className="w-9 h-9 rounded-lg bg-slate-600 flex items-center justify-center">
        <FolderOpen className="h-5 w-5 text-white" />
      </div>

      {/* Section info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{section.title}</div>
        <div className="text-xs text-muted-foreground">
          {section.taskCount !== undefined
            ? `${section.taskCount} task${section.taskCount !== 1 ? "s" : ""}`
            : "Section"}
        </div>
      </div>
    </div>
  );
}

// Add here button
function AddHereButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 py-2.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-sm font-medium border-t first:border-t-0"
    >
      <Plus className="h-4 w-4" />
      {label || "Add here"}
    </button>
  );
}
