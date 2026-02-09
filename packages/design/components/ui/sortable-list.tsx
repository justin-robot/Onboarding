"use client";

import React, { useState, useCallback } from "react";
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
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "../../lib/utils";

// Types
export interface SortableItem {
  id: string;
  [key: string]: unknown;
}

export interface SortableListProps<T extends SortableItem> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number, isDragging: boolean) => React.ReactNode;
  direction?: "vertical" | "horizontal";
  className?: string;
  itemClassName?: string;
  dragOverlayClassName?: string;
  disabled?: boolean;
}

export interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

// Sortable Item Wrapper Component
export function SortableItemWrapper({
  id,
  children,
  className,
  disabled = false,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: disabled ? "default" : "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("touch-none", className)}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

// Main SortableList Component
export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  direction = "vertical",
  className,
  itemClassName,
  dragOverlayClassName,
  disabled = false,
}: SortableListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        onReorder(newItems);
      }

      setActiveId(null);
    },
    [items, onReorder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const activeItem = activeId
    ? items.find((item) => item.id === activeId)
    : null;
  const activeIndex = activeId
    ? items.findIndex((item) => item.id === activeId)
    : -1;

  const strategy =
    direction === "vertical"
      ? verticalListSortingStrategy
      : horizontalListSortingStrategy;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={strategy}>
        <div
          className={cn(
            direction === "vertical" ? "flex flex-col" : "flex flex-row",
            className
          )}
        >
          {items.map((item, index) => (
            <SortableItemWrapper
              key={item.id}
              id={item.id}
              className={itemClassName}
              disabled={disabled}
            >
              {renderItem(item, index, item.id === activeId)}
            </SortableItemWrapper>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem && activeIndex !== -1 ? (
          <div className={cn("shadow-lg", dragOverlayClassName)}>
            {renderItem(activeItem, activeIndex, true)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Hook for using sortable in custom implementations
export { useSortable, arrayMove } from "@dnd-kit/sortable";
export { CSS } from "@dnd-kit/utilities";
