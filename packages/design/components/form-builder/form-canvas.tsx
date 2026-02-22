"use client";

import React, { useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Type,
  AlignLeft,
  Hash,
  Calendar,
  Upload,
  ChevronDown,
  Circle,
  CheckSquare,
  Heading,
  FileText,
  Image,
  Minus,
  Mail,
  Phone,
  Trash2,
  GripVertical,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { type FormElement, type FormElementType } from "./types";

// Icon mapping
const ICONS: Record<FormElementType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  date: Calendar,
  file: Upload,
  select: ChevronDown,
  radio: Circle,
  checkbox: CheckSquare,
  heading: Heading,
  paragraph: FileText,
  image: Image,
  divider: Minus,
  email: Mail,
  phone: Phone,
};

interface FormCanvasProps {
  elements: FormElement[];
  onElementsChange: (elements: FormElement[]) => void;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  className?: string;
  isOver?: boolean;
}

interface SortableCanvasElementProps {
  element: FormElement;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SortableCanvasElement({
  element,
  isSelected,
  onSelect,
  onDelete,
}: SortableCanvasElementProps) {
  const Icon = ICONS[element.type] ?? Type;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: element.id,
    data: {
      type: "canvas-element",
      element,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-start gap-3 p-4 rounded-lg border bg-card",
        "transition-all touch-none",
        isSelected && "ring-2 ring-primary border-primary",
        isDragging && "opacity-50 shadow-lg",
        !isSelected && "hover:border-muted-foreground/50"
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      <div
        className="flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-shrink-0 mt-0.5">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{element.label}</div>
        {element.placeholder && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {element.placeholder}
          </div>
        )}
        {element.helpText && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {element.helpText}
          </div>
        )}
        <div className="text-xs text-muted-foreground/70 mt-1">
          {element.type}
          {element.required && <span className="text-destructive ml-1">*</span>}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className={cn(
          "flex-shrink-0 p-1 rounded-md",
          "opacity-0 group-hover:opacity-100",
          "hover:bg-destructive hover:text-destructive-foreground",
          "transition-opacity"
        )}
        aria-label="Delete element"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function FormCanvas({
  elements,
  onElementsChange,
  selectedElementId,
  onSelectElement,
  className,
  isOver,
}: FormCanvasProps) {
  const { setNodeRef, isOver: isOverDroppable } = useDroppable({
    id: "form-canvas",
    data: {
      type: "canvas",
    },
  });

  const isHighlighted = isOver || isOverDroppable;

  const handleDelete = useCallback(
    (id: string) => {
      const newElements = elements
        .filter((el) => el.id !== id)
        .map((el, index) => ({ ...el, position: index }));
      onElementsChange(newElements);
      if (selectedElementId === id) {
        onSelectElement(null);
      }
    },
    [elements, onElementsChange, selectedElementId, onSelectElement]
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 p-6 overflow-auto transition-colors",
        isHighlighted && "bg-accent/20",
        className
      )}
    >
      {elements.length === 0 ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center h-64",
            "border-2 border-dashed rounded-lg",
            "text-muted-foreground pointer-events-none",
            isHighlighted
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          )}
        >
          <p className="text-sm">Drag elements here to build your form</p>
          <p className="text-xs mt-1">or click an element in the palette</p>
        </div>
      ) : (
        <SortableContext
          items={elements.map((el) => el.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {elements.map((element) => (
              <SortableCanvasElement
                key={element.id}
                element={element}
                isSelected={selectedElementId === element.id}
                onSelect={() => onSelectElement(element.id)}
                onDelete={() => handleDelete(element.id)}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

// Export a drag overlay component for canvas elements
export function CanvasElementDragOverlay({ element }: { element: FormElement }) {
  const Icon = ICONS[element.type] ?? Type;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border bg-card",
        "shadow-lg cursor-grabbing"
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-shrink-0 mt-0.5">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{element.label}</div>
        <div className="text-xs text-muted-foreground/70 mt-1">
          {element.type}
        </div>
      </div>
    </div>
  );
}
