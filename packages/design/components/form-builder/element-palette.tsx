"use client";

import React from "react";
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
  GripVertical,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { PALETTE_ITEMS, type FormElementType, type PaletteItem } from "./types";

// Icon mapping
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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
};

interface ElementPaletteProps {
  onAddElement: (type: FormElementType) => void;
  className?: string;
}

interface PaletteItemButtonProps {
  item: PaletteItem;
  onAdd: () => void;
}

function PaletteItemButton({ item, onAdd }: PaletteItemButtonProps) {
  const Icon = ICONS[item.icon] ?? Type;

  return (
    <button
      type="button"
      onClick={onAdd}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/form-element-type", item.type);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className={cn(
        "flex items-center gap-2 w-full p-2 rounded-md text-sm",
        "hover:bg-accent hover:text-accent-foreground",
        "cursor-grab active:cursor-grabbing",
        "transition-colors"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </button>
  );
}

interface PaletteSectionProps {
  title: string;
  items: PaletteItem[];
  onAddElement: (type: FormElementType) => void;
}

function PaletteSection({ title, items, onAddElement }: PaletteSectionProps) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
        {title}
      </h4>
      <div className="space-y-0.5">
        {items.map((item) => (
          <PaletteItemButton
            key={item.type}
            item={item}
            onAdd={() => onAddElement(item.type)}
          />
        ))}
      </div>
    </div>
  );
}

export function ElementPalette({ onAddElement, className }: ElementPaletteProps) {
  const inputItems = PALETTE_ITEMS.filter((i) => i.category === "input");
  const selectionItems = PALETTE_ITEMS.filter((i) => i.category === "selection");
  const displayItems = PALETTE_ITEMS.filter((i) => i.category === "display");
  const contactItems = PALETTE_ITEMS.filter((i) => i.category === "contact");

  return (
    <div className={cn("space-y-4 p-4", className)}>
      <h3 className="font-semibold text-sm">Elements</h3>
      <div className="space-y-4">
        <PaletteSection title="Input" items={inputItems} onAddElement={onAddElement} />
        <PaletteSection title="Selection" items={selectionItems} onAddElement={onAddElement} />
        <PaletteSection title="Display" items={displayItems} onAddElement={onAddElement} />
        <PaletteSection title="Contact" items={contactItems} onAddElement={onAddElement} />
      </div>
    </div>
  );
}
