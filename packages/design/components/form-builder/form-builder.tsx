"use client";

import React, { useCallback, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { cn } from "../../lib/utils";
import { ElementPalette, PaletteItemDragOverlay } from "./element-palette";
import { ElementPropertyEditor } from "./element-property-editor";
import { FormCanvas, CanvasElementDragOverlay } from "./form-canvas";
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

// Types for drag data
interface PaletteDragData {
  type: "palette-item";
  elementType: FormElementType;
}

interface CanvasElementDragData {
  type: "canvas-element";
  element: FormElement;
}

type DragData = PaletteDragData | CanvasElementDragData;

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
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);
  const [isOverCanvas, setIsOverCanvas] = useState(false);

  const activePage = config.pages.find((p) => p.id === activePageId);
  const activeElements = activePage?.elements ?? [];

  // Configure sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    if (data) {
      setActiveDragData(data);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const isOverCanvasArea =
      event.over?.data.current?.type === "canvas" ||
      event.over?.data.current?.type === "canvas-element";
    setIsOverCanvas(isOverCanvasArea);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const activeData = active.data.current as DragData | undefined;

      setActiveDragData(null);
      setIsOverCanvas(false);

      if (!activeData || !over) return;

      // Handle palette item dropped on canvas
      if (activeData.type === "palette-item") {
        const overData = over.data.current;
        if (overData?.type === "canvas" || overData?.type === "canvas-element") {
          handleAddElement(activeData.elementType);
        }
        return;
      }

      // Handle canvas element reordering
      if (activeData.type === "canvas-element") {
        if (active.id !== over.id) {
          const oldIndex = activeElements.findIndex((el) => el.id === active.id);
          const newIndex = activeElements.findIndex((el) => el.id === over.id);

          if (oldIndex !== -1 && newIndex !== -1) {
            const newElements = arrayMove(activeElements, oldIndex, newIndex).map(
              (el, index) => ({ ...el, position: index })
            );
            handleElementsChange(newElements);
          }
        }
      }
    },
    [activeElements, handleAddElement, handleElementsChange]
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragData(null);
    setIsOverCanvas(false);
  }, []);

  // Get the currently selected element
  const selectedElement = selectedElementId
    ? activeElements.find((el) => el.id === selectedElementId) ?? null
    : null;

  // Render drag overlay based on what's being dragged
  const renderDragOverlay = () => {
    if (!activeDragData) return null;

    if (activeDragData.type === "palette-item") {
      return <PaletteItemDragOverlay type={activeDragData.elementType} />;
    }

    if (activeDragData.type === "canvas-element") {
      return <CanvasElementDragOverlay element={activeDragData.element} />;
    }

    return null;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
            isOver={isOverCanvas}
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

      <DragOverlay dropAnimation={null}>
        {renderDragOverlay()}
      </DragOverlay>
    </DndContext>
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
