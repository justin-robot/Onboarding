"use client";

import React, { useCallback } from "react";
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
import { SortableList, type SortableItem } from "../ui/sortable-list";
import { cn } from "../../lib/utils";
import { type FormElement, type FormElementType, getDefaultElement } from "./types";

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
  onAddElement: (type: FormElementType) => void;
  className?: string;
}

interface CanvasElementProps {
  element: FormElement;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isDragging: boolean;
}

function CanvasElement({
  element,
  isSelected,
  onSelect,
  onDelete,
  isDragging,
}: CanvasElementProps) {
  const Icon = ICONS[element.type] ?? Type;

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 p-4 rounded-lg border bg-card",
        "transition-all",
        isSelected && "ring-2 ring-primary border-primary",
        isDragging && "opacity-50",
        !isSelected && "hover:border-muted-foreground/50"
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      <div className="flex-shrink-0 mt-0.5 cursor-grab">
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

// Extend FormElement with SortableItem
interface SortableFormElement extends FormElement, SortableItem {}

export function FormCanvas({
  elements,
  onElementsChange,
  selectedElementId,
  onSelectElement,
  onAddElement,
  className,
}: FormCanvasProps) {
  const handleReorder = useCallback(
    (newElements: SortableFormElement[]) => {
      // Update positions based on new order
      const updatedElements = newElements.map((el, index) => ({
        ...el,
        position: index,
      }));
      onElementsChange(updatedElements);
    },
    [onElementsChange]
  );

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const elementType = e.dataTransfer.getData("application/form-element-type") as FormElementType;
      if (elementType) {
        onAddElement(elementType);
      }
    },
    [onAddElement]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  // Cast elements to sortable elements
  const sortableElements: SortableFormElement[] = elements.map((el) => ({
    ...el,
    id: el.id,
  }));

  return (
    <div
      className={cn("flex-1 p-6 overflow-auto", className)}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {elements.length === 0 ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center h-64",
            "border-2 border-dashed border-muted-foreground/25 rounded-lg",
            "text-muted-foreground"
          )}
        >
          <p className="text-sm">Drag elements here to build your form</p>
          <p className="text-xs mt-1">or click an element in the palette</p>
        </div>
      ) : (
        <SortableList
          items={sortableElements}
          onReorder={handleReorder}
          className="space-y-2"
          renderItem={(element, _index, isDragging) => (
            <CanvasElement
              element={element}
              isSelected={selectedElementId === element.id}
              onSelect={() => onSelectElement(element.id)}
              onDelete={() => handleDelete(element.id)}
              isDragging={isDragging}
            />
          )}
        />
      )}
    </div>
  );
}
