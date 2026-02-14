"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { SectionHeader, SectionStatus } from "./section-header";
import { TaskCard, TaskType } from "./task-card";
import { Timeline, TimelineStep, TimelineStepStatus } from "./timeline";
import { useIsDesktop } from "./use-media-query";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";

interface FlowTask {
  id: string;
  title: string;
  type: TaskType;
  position: number;
  isYourTurn?: boolean;
  isCompleted?: boolean;
  isLocked?: boolean;
  description?: string;
  dueDate?: Date | string;
  assignees?: string[];
}

interface FlowSection {
  id: string;
  title: string;
  description?: string;
  status: SectionStatus;
  tasks: FlowTask[];
}

interface FlowViewProps {
  /** Sections to display */
  sections: FlowSection[];
  /** Currently selected task ID */
  selectedTaskId?: string;
  /** Callback when a task is clicked */
  onTaskSelect?: (taskId: string) => void;
  /** Callback when add task is clicked */
  onAddTask?: (sectionId: string) => void;
  /** Whether to show timeline (auto-hides on mobile) */
  showTimeline?: boolean;
  /** Timeline position */
  timelinePosition?: "left" | "right";
  /** Optional class name */
  className?: string;
  /** Force compact mode (auto-detected from viewport if not set) */
  compact?: boolean;
}

/**
 * Convert flow sections to timeline steps
 */
function sectionsToTimelineSteps(sections: FlowSection[]): TimelineStep[] {
  const steps: TimelineStep[] = [];
  let stepNumber = 1;

  sections.forEach((section) => {
    section.tasks.forEach((task) => {
      let status: TimelineStepStatus;
      if (task.isCompleted) {
        status = "completed";
      } else if (task.isLocked) {
        status = "locked";
      } else if (task.isYourTurn) {
        status = "current";
      } else {
        status = "upcoming";
      }

      steps.push({
        id: task.id,
        number: stepNumber++,
        title: task.title,
        status,
      });
    });
  });

  return steps;
}

/**
 * Flow view component matching Moxo's main content area
 * Shows sections with tasks and optional timeline
 * Automatically adapts to mobile/desktop layouts
 */
export function FlowView({
  sections,
  selectedTaskId,
  onTaskSelect,
  onAddTask,
  showTimeline = true,
  timelinePosition = "left",
  className,
  compact,
}: FlowViewProps) {
  const isDesktop = useIsDesktop();
  const isCompact = compact ?? !isDesktop;

  // Track collapsed sections
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(
    new Set()
  );

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Generate timeline steps
  const timelineSteps = React.useMemo(
    () => sectionsToTimelineSteps(sections),
    [sections]
  );

  // Calculate progress for each section
  const getSectionProgress = (section: FlowSection) => {
    const completed = section.tasks.filter((t) => t.isCompleted).length;
    return { completedCount: completed, totalCount: section.tasks.length };
  };

  // Hide timeline on mobile
  const shouldShowTimeline = showTimeline && isDesktop;

  return (
    <div className={cn("flex h-full", className)}>
      {/* Timeline (optional, left) - hidden on mobile */}
      {shouldShowTimeline && timelinePosition === "left" && (
        <div className="hidden w-48 shrink-0 border-r border-border bg-muted/20 p-4 lg:block">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Steps
          </h3>
          <Timeline
            steps={timelineSteps}
            selectedStepId={selectedTaskId}
            onStepClick={onTaskSelect}
          />
        </div>
      )}

      {/* Main content */}
      <ScrollArea className="flex-1">
        <div className={cn(
          "space-y-4",
          isCompact ? "p-3" : "space-y-6 p-6"
        )}>
          {sections.map((section) => {
            const progress = getSectionProgress(section);
            const isCollapsed = collapsedSections.has(section.id);

            return (
              <SectionHeader
                key={section.id}
                title={section.title}
                description={section.description}
                status={section.status}
                completedCount={progress.completedCount}
                totalCount={progress.totalCount}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => toggleSection(section.id)}
              >
                <div className={cn("space-y-2", isCompact && "space-y-1.5")}>
                  {section.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      id={task.id}
                      title={task.title}
                      type={task.type}
                      position={task.position}
                      isYourTurn={task.isYourTurn}
                      isCompleted={task.isCompleted}
                      isLocked={task.isLocked}
                      isSelected={task.id === selectedTaskId}
                      description={isCompact ? undefined : task.description}
                      dueDate={task.dueDate}
                      assignees={task.assignees}
                      onClick={() => onTaskSelect?.(task.id)}
                    />
                  ))}
                  {onAddTask && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-muted-foreground hover:text-foreground"
                      onClick={() => onAddTask(section.id)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add task
                    </Button>
                  )}
                </div>
              </SectionHeader>
            );
          })}

          {sections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No tasks in this workspace yet</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Timeline (optional, right) - hidden on mobile */}
      {shouldShowTimeline && timelinePosition === "right" && (
        <div className="hidden w-48 shrink-0 border-l border-border bg-muted/20 p-4 lg:block">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Steps
          </h3>
          <Timeline
            steps={timelineSteps}
            selectedStepId={selectedTaskId}
            onStepClick={onTaskSelect}
          />
        </div>
      )}
    </div>
  );
}

export type { FlowViewProps, FlowSection, FlowTask };
