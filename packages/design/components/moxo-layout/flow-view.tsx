"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { SectionHeader, SectionStatus } from "./section-header";
import { TaskCard, TaskType } from "./task-card";
import { Timeline, TimelineStep, TimelineStepStatus } from "./timeline";
import { useIsDesktop } from "./use-media-query";
import { Button } from "../ui/button";
import { Plus, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  createdAt?: Date | string;
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
  /** Callback when tasks are reordered within a section */
  onTaskReorder?: (sectionId: string, taskIds: string[]) => void;
  /** Callback when sections are reordered */
  onSectionReorder?: (sectionIds: string[]) => void;
  /** Whether drag and drop is enabled */
  enableDragAndDrop?: boolean;
  /** Whether to show timeline (auto-hides on mobile) */
  showTimeline?: boolean;
  /** Timeline position */
  timelinePosition?: "left" | "right";
  /** Optional class name */
  className?: string;
  /** Force compact mode (auto-detected from viewport if not set) */
  compact?: boolean;
}

// Sortable Task Card Wrapper
function SortableTaskCard({
  task,
  isSelected,
  isCompact,
  onTaskSelect,
  isDragDisabled,
}: {
  task: FlowTask;
  isSelected: boolean;
  isCompact: boolean;
  onTaskSelect?: (taskId: string) => void;
  isDragDisabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isDragDisabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/task">
      {!isDragDisabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 opacity-0 group-hover/task:opacity-100 cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground transition-opacity"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <TaskCard
        id={task.id}
        title={task.title}
        type={task.type}
        position={task.position}
        isYourTurn={task.isYourTurn}
        isCompleted={task.isCompleted}
        isLocked={task.isLocked}
        isSelected={isSelected}
        description={isCompact ? undefined : task.description}
        dueDate={task.dueDate}
        createdAt={task.createdAt}
        assignees={task.assignees}
        onClick={() => onTaskSelect?.(task.id)}
      />
    </div>
  );
}

// Sortable Section Wrapper
function SortableSection({
  section,
  children,
  progress,
  isCollapsed,
  onToggleCollapse,
  onAddTask,
  isDragDisabled,
}: {
  section: FlowSection;
  children: React.ReactNode;
  progress: { completedCount: number; totalCount: number };
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onAddTask?: (sectionId: string) => void;
  isDragDisabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: isDragDisabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/section">
      {!isDragDisabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-4 -translate-x-6 opacity-0 group-hover/section:opacity-100 cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground transition-opacity z-10"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <SectionHeader
        title={section.title}
        description={section.description}
        status={section.status}
        completedCount={progress.completedCount}
        totalCount={progress.totalCount}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      >
        {children}
      </SectionHeader>
    </div>
  );
}

/**
 * Convert flow sections to timeline steps
 */
function sectionsToTimelineSteps(sections: FlowSection[]): TimelineStep[] {
  const steps: TimelineStep[] = [];
  let stepNumber = 1;

  sections.forEach((section) => {
    const tasks = section.tasks || [];
    tasks.forEach((task) => {
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
 * Supports drag and drop reordering of sections and tasks
 */
export function FlowView({
  sections,
  selectedTaskId,
  onTaskSelect,
  onAddTask,
  onTaskReorder,
  onSectionReorder,
  enableDragAndDrop = false,
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

  // Track active drag item
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
  const [activeDragType, setActiveDragType] = React.useState<"task" | "section" | null>(null);

  // Track mounted state to avoid hydration mismatch with dnd-kit
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate timeline steps
  const timelineSteps = React.useMemo(
    () => sectionsToTimelineSteps(sections),
    [sections]
  );

  // Calculate progress for each section
  const getSectionProgress = (section: FlowSection) => {
    const tasks = section.tasks || [];
    const completed = tasks.filter((t) => t.isCompleted).length;
    return { completedCount: completed, totalCount: tasks.length };
  };

  // Find which section a task belongs to
  const findTaskSection = (taskId: string): FlowSection | undefined => {
    return sections.find((section) =>
      (section.tasks || []).some((task) => task.id === taskId)
    );
  };

  // Find active task or section
  const getActiveItem = () => {
    if (!activeId) return null;

    // Check if it's a section
    const activeSection = sections.find((s) => s.id === activeId);
    if (activeSection) return { type: "section" as const, item: activeSection };

    // Check if it's a task
    for (const section of sections) {
      const task = (section.tasks || []).find((t) => t.id === activeId);
      if (task) return { type: "task" as const, item: task };
    }

    return null;
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);

    // Determine if we're dragging a section or task
    const isSection = sections.some((s) => s.id === active.id);
    setActiveDragType(isSection ? "section" : "task");
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setActiveDragType(null);

    if (!over || active.id === over.id) return;

    // Check if we're reordering sections
    const activeSection = sections.find((s) => s.id === active.id);
    const overSection = sections.find((s) => s.id === over.id);

    if (activeSection && overSection) {
      // Section reordering
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      const newSectionIds = arrayMove(
        sections.map((s) => s.id),
        oldIndex,
        newIndex
      );
      onSectionReorder?.(newSectionIds);
      return;
    }

    // Task reordering within the same section
    const activeTaskSection = findTaskSection(active.id as string);
    const overTaskSection = findTaskSection(over.id as string);

    if (activeTaskSection && overTaskSection && activeTaskSection.id === overTaskSection.id) {
      const sectionTasks = activeTaskSection.tasks;
      const oldIndex = sectionTasks.findIndex((t) => t.id === active.id);
      const newIndex = sectionTasks.findIndex((t) => t.id === over.id);
      const newTaskIds = arrayMove(
        sectionTasks.map((t) => t.id),
        oldIndex,
        newIndex
      );
      onTaskReorder?.(activeTaskSection.id, newTaskIds);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveDragType(null);
  };

  // Hide timeline on mobile
  const shouldShowTimeline = showTimeline && isDesktop;

  // Determine if drag is enabled (requires mounted to avoid hydration mismatch)
  const isDragEnabled = mounted && enableDragAndDrop && (onTaskReorder || onSectionReorder);

  // Get active item for overlay
  const activeItem = getActiveItem();

  // Render content (with or without DnD)
  const renderContent = () => (
    <div className={cn(
      "space-y-4",
      isCompact ? "p-3" : "space-y-6 p-6",
      isDragEnabled && "pl-8" // Extra padding for drag handles
    )}>
      {isDragEnabled ? (
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => {
            const progress = getSectionProgress(section);
            const isCollapsed = collapsedSections.has(section.id);

            return (
              <SortableSection
                key={section.id}
                section={section}
                progress={progress}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => toggleSection(section.id)}
                onAddTask={onAddTask}
                isDragDisabled={!onSectionReorder}
              >
                <div className={cn("space-y-2 pl-2", isCompact && "space-y-1.5")}>
                  <SortableContext
                    items={(section.tasks || []).map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {(section.tasks || []).map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        isSelected={task.id === selectedTaskId}
                        isCompact={isCompact}
                        onTaskSelect={onTaskSelect}
                        isDragDisabled={!onTaskReorder}
                      />
                    ))}
                  </SortableContext>
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
              </SortableSection>
            );
          })}
        </SortableContext>
      ) : (
        sections.map((section) => {
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
                {(section.tasks || []).map((task) => (
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
                    createdAt={task.createdAt}
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
        })
      )}

      {sections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No tasks in this workspace yet</p>
        </div>
      )}
    </div>
  );

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
        {isDragEnabled ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            {renderContent()}
            <DragOverlay>
              {activeItem?.type === "task" && (
                <div className="shadow-lg rounded-lg">
                  <TaskCard
                    id={activeItem.item.id}
                    title={activeItem.item.title}
                    type={activeItem.item.type}
                    position={activeItem.item.position}
                    isYourTurn={activeItem.item.isYourTurn}
                    isCompleted={activeItem.item.isCompleted}
                    isLocked={activeItem.item.isLocked}
                    isSelected={false}
                    description={isCompact ? undefined : activeItem.item.description}
                    dueDate={activeItem.item.dueDate}
                    createdAt={activeItem.item.createdAt}
                  />
                </div>
              )}
              {activeItem?.type === "section" && (
                <div className="shadow-lg rounded-lg bg-background border p-4">
                  <span className="font-medium">{activeItem.item.title}</span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          renderContent()
        )}
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
