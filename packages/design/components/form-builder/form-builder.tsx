"use client";

import React, { useCallback, useState } from "react";
import { cn } from "../../lib/utils";
import { ElementPalette } from "./element-palette";
import { ElementPropertyEditor } from "./element-property-editor";
import { FormCanvas } from "./form-canvas";
import { PageTabs } from "./page-tabs";
import {
  type FormConfig,
  type FormElement,
  type FormElementType,
  type FormPage,
  getDefaultElement,
} from "./types";

interface FormBuilderProps {
  config: FormConfig;
  onConfigChange: (config: FormConfig) => void;
  className?: string;
}

function generateId(): string {
  return `el_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generatePageId(): string {
  return `page_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function FormBuilder({
  config,
  onConfigChange,
  className,
}: FormBuilderProps) {
  const [activePageId, setActivePageId] = useState<string>(
    config.pages[0]?.id ?? ""
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null
  );

  const activePage = config.pages.find((p) => p.id === activePageId);
  const activeElements = activePage?.elements ?? [];

  // Page management
  const handleAddPage = useCallback(() => {
    const newPage: FormPage = {
      id: generatePageId(),
      title: `Page ${config.pages.length + 1}`,
      position: config.pages.length,
      elements: [],
    };

    onConfigChange({
      ...config,
      pages: [...config.pages, newPage],
    });

    setActivePageId(newPage.id);
    setSelectedElementId(null);
  }, [config, onConfigChange]);

  const handleDeletePage = useCallback(
    (pageId: string) => {
      if (config.pages.length <= 1) return;

      const pageIndex = config.pages.findIndex((p) => p.id === pageId);
      const newPages = config.pages
        .filter((p) => p.id !== pageId)
        .map((p, index) => ({ ...p, position: index }));

      onConfigChange({
        ...config,
        pages: newPages,
      });

      // Switch to adjacent page
      if (activePageId === pageId) {
        const newIndex = Math.min(pageIndex, newPages.length - 1);
        setActivePageId(newPages[newIndex]?.id ?? "");
        setSelectedElementId(null);
      }
    },
    [config, onConfigChange, activePageId]
  );

  const handleRenamePage = useCallback(
    (pageId: string, title: string) => {
      onConfigChange({
        ...config,
        pages: config.pages.map((p) => (p.id === pageId ? { ...p, title } : p)),
      });
    },
    [config, onConfigChange]
  );

  const handlePageChange = useCallback((pageId: string) => {
    setActivePageId(pageId);
    setSelectedElementId(null);
  }, []);

  // Element management
  const handleAddElement = useCallback(
    (type: FormElementType) => {
      if (!activePage) return;

      const newElement = getDefaultElement(
        type,
        generateId(),
        activeElements.length
      );

      const updatedPage: FormPage = {
        ...activePage,
        elements: [...activePage.elements, newElement],
      };

      onConfigChange({
        ...config,
        pages: config.pages.map((p) =>
          p.id === activePageId ? updatedPage : p
        ),
      });

      setSelectedElementId(newElement.id);
    },
    [config, onConfigChange, activePageId, activePage, activeElements.length]
  );

  const handleElementsChange = useCallback(
    (elements: FormElement[]) => {
      if (!activePage) return;

      onConfigChange({
        ...config,
        pages: config.pages.map((p) =>
          p.id === activePageId ? { ...p, elements } : p
        ),
      });
    },
    [config, onConfigChange, activePageId, activePage]
  );

  // Update a single element (from property editor)
  const handleElementUpdate = useCallback(
    (updatedElement: FormElement) => {
      if (!activePage) return;

      const newElements = activePage.elements.map((el) =>
        el.id === updatedElement.id ? updatedElement : el
      );

      onConfigChange({
        ...config,
        pages: config.pages.map((p) =>
          p.id === activePageId ? { ...p, elements: newElements } : p
        ),
      });
    },
    [config, onConfigChange, activePageId, activePage]
  );

  // Get the currently selected element
  const selectedElement = selectedElementId
    ? activeElements.find((el) => el.id === selectedElementId) ?? null
    : null;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Page tabs */}
      <div className="flex-shrink-0 px-4 py-2 border-b">
        <PageTabs
          pages={config.pages}
          activePageId={activePageId}
          onPageChange={handlePageChange}
          onAddPage={handleAddPage}
          onDeletePage={handleDeletePage}
          onRenamePage={handleRenamePage}
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Element palette sidebar */}
        <div className="flex-shrink-0 w-56 border-r overflow-y-auto">
          <ElementPalette onAddElement={handleAddElement} />
        </div>

        {/* Canvas area */}
        <FormCanvas
          elements={activeElements}
          onElementsChange={handleElementsChange}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
          onAddElement={handleAddElement}
          className="flex-1"
        />

        {/* Property editor sidebar */}
        {selectedElement && (
          <div className="flex-shrink-0 w-72 border-l overflow-y-auto">
            <ElementPropertyEditor
              element={selectedElement}
              onElementChange={handleElementUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to create an empty form config
export function createEmptyFormConfig(taskId: string): FormConfig {
  const pageId = generatePageId();
  return {
    id: generateId(),
    taskId,
    pages: [
      {
        id: pageId,
        title: "Page 1",
        position: 0,
        elements: [],
      },
    ],
  };
}
