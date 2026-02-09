"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type FormConfig, type FormPage } from "./types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseFormBuilderOptions {
  taskId: string;
  debounceMs?: number;
  onError?: (error: Error) => void;
}

interface UseFormBuilderReturn {
  config: FormConfig | null;
  isLoading: boolean;
  saveStatus: SaveStatus;
  error: Error | null;
  updateConfig: (config: FormConfig) => void;
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyConfig(taskId: string): FormConfig {
  return {
    id: generateId(),
    taskId,
    pages: [
      {
        id: generateId(),
        title: "Page 1",
        position: 0,
        elements: [],
      },
    ],
  };
}

export function useFormBuilder({
  taskId,
  debounceMs = 500,
  onError,
}: UseFormBuilderOptions): UseFormBuilderReturn {
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  // Track the latest config for debounced save
  const pendingConfigRef = useRef<FormConfig | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Load initial config
  useEffect(() => {
    isMountedRef.current = true;

    const loadConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/forms/${taskId}`);
        if (!response.ok) {
          throw new Error(`Failed to load form: ${response.statusText}`);
        }

        const data = await response.json();

        if (!isMountedRef.current) return;

        // If no form exists yet, create empty config
        if (!data.id || data.pages.length === 0) {
          setConfig(createEmptyConfig(taskId));
        } else {
          // Map API response to FormConfig structure
          setConfig({
            id: data.id,
            taskId: data.taskId,
            pages: data.pages.map((page: FormPage) => ({
              id: page.id,
              title: page.title,
              position: page.position,
              elements: page.elements || [],
            })),
          });
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        onError?.(error);
        // Still create empty config so user can work
        setConfig(createEmptyConfig(taskId));
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadConfig();

    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [taskId, onError]);

  // Save function
  const saveConfig = useCallback(
    async (configToSave: FormConfig) => {
      try {
        setSaveStatus("saving");

        const response = await fetch(`/api/forms/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pages: configToSave.pages.map((page) => ({
              id: page.id,
              title: page.title,
              position: page.position,
              elements: page.elements.map((el) => ({
                id: el.id,
                type: el.type,
                label: el.label,
                placeholder: el.placeholder,
                helpText: el.helpText,
                required: el.required,
                options: el.options,
                validation: el.validation,
                position: el.position,
              })),
            })),
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save form: ${response.statusText}`);
        }

        if (isMountedRef.current) {
          setSaveStatus("saved");
          // Reset to idle after 2 seconds
          setTimeout(() => {
            if (isMountedRef.current) {
              setSaveStatus("idle");
            }
          }, 2000);
        }
      } catch (err) {
        if (isMountedRef.current) {
          const error = err instanceof Error ? err : new Error("Unknown error");
          setError(error);
          setSaveStatus("error");
          onError?.(error);
        }
      }
    },
    [taskId, onError]
  );

  // Debounced update function
  const updateConfig = useCallback(
    (newConfig: FormConfig) => {
      setConfig(newConfig);
      pendingConfigRef.current = newConfig;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new debounced save
      saveTimeoutRef.current = setTimeout(() => {
        if (pendingConfigRef.current) {
          saveConfig(pendingConfigRef.current);
        }
      }, debounceMs);
    },
    [debounceMs, saveConfig]
  );

  return {
    config,
    isLoading,
    saveStatus,
    error,
    updateConfig,
  };
}
