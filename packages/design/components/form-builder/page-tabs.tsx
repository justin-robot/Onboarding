"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { type FormPage } from "./types";

interface PageTabsProps {
  pages: FormPage[];
  activePageId: string;
  onPageChange: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
  onRenamePage: (pageId: string, title: string) => void;
  className?: string;
}

interface PageTabProps {
  page: FormPage;
  isActive: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}

function PageTab({
  page,
  isActive,
  canDelete,
  onSelect,
  onDelete,
  onRename,
}: PageTabProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(page.title);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setEditValue(page.title);
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== page.title) {
      onRename(editValue.trim());
    } else {
      setEditValue(page.title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setEditValue(page.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-1 px-3 py-1.5 rounded-md text-sm",
        "transition-colors cursor-pointer",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
      )}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !isEditing) onSelect();
      }}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "w-20 bg-transparent border-none outline-none",
            "text-sm font-medium"
          )}
        />
      ) : (
        <span className="font-medium truncate max-w-[100px]">{page.title}</span>
      )}

      {canDelete && !isEditing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={cn(
            "p-0.5 rounded-sm",
            "opacity-0 group-hover:opacity-100",
            "hover:bg-destructive hover:text-destructive-foreground",
            "transition-opacity"
          )}
          aria-label={`Delete ${page.title}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function PageTabs({
  pages,
  activePageId,
  onPageChange,
  onAddPage,
  onDeletePage,
  onRenamePage,
  className,
}: PageTabsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 p-1 bg-muted rounded-lg",
        className
      )}
      role="tablist"
    >
      {pages.map((page) => (
        <PageTab
          key={page.id}
          page={page}
          isActive={activePageId === page.id}
          canDelete={pages.length > 1}
          onSelect={() => onPageChange(page.id)}
          onDelete={() => onDeletePage(page.id)}
          onRename={(title) => onRenamePage(page.id, title)}
        />
      ))}

      <button
        type="button"
        onClick={onAddPage}
        className={cn(
          "flex items-center justify-center p-1.5 rounded-md",
          "text-muted-foreground hover:text-foreground",
          "hover:bg-background/50 transition-colors"
        )}
        aria-label="Add page"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
