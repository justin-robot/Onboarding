"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type DraftStatus = "idle" | "loading" | "saving" | "saved" | "error" | "submitting" | "submitted";

interface DraftData {
  id: string;
  formConfigId: string;
  userId: string;
  status: "draft" | "submitted";
  values: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface UseFormDraftOptions {
  formConfigId: string;
  debounceMs?: number;
  onError?: (error: Error) => void;
  onSubmitSuccess?: () => void;
}

interface UseFormDraftReturn {
  values: Record<string, unknown>;
  isLoading: boolean;
  status: DraftStatus;
  error: Error | null;
  updateValues: (values: Record<string, unknown>) => void;
  submitForm: () => Promise<void>;
  clearDraft: () => Promise<void>;
}

export function useFormDraft({
  formConfigId,
  debounceMs = 500,
  onError,
  onSubmitSuccess,
}: UseFormDraftOptions): UseFormDraftReturn {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<DraftStatus>("loading");
  const [error, setError] = useState<Error | null>(null);

  // Track the latest values for debounced save
  const pendingValuesRef = useRef<Record<string, unknown> | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Load initial draft
  useEffect(() => {
    isMountedRef.current = true;

    const loadDraft = async () => {
      try {
        setIsLoading(true);
        setStatus("loading");
        setError(null);

        const response = await fetch(`/api/submissions/${formConfigId}/draft`);
        if (!response.ok) {
          throw new Error(`Failed to load draft: ${response.statusText}`);
        }

        const data: DraftData = await response.json();

        if (!isMountedRef.current) return;

        // If already submitted, show submitted status
        if (data.status === "submitted") {
          setStatus("submitted");
          setValues(data.values || {});
        } else {
          setStatus("idle");
          setValues(data.values || {});
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        setStatus("error");
        onError?.(error);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadDraft();

    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formConfigId, onError]);

  // Save function
  const saveDraft = useCallback(
    async (valuesToSave: Record<string, unknown>) => {
      try {
        setStatus("saving");

        const response = await fetch(`/api/submissions/${formConfigId}/draft`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values: valuesToSave }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save draft: ${response.statusText}`);
        }

        if (isMountedRef.current) {
          setStatus("saved");
          // Reset to idle after 2 seconds
          setTimeout(() => {
            if (isMountedRef.current && status !== "submitting" && status !== "submitted") {
              setStatus("idle");
            }
          }, 2000);
        }
      } catch (err) {
        if (isMountedRef.current) {
          const error = err instanceof Error ? err : new Error("Unknown error");
          setError(error);
          setStatus("error");
          onError?.(error);
        }
      }
    },
    [formConfigId, onError, status]
  );

  // Debounced update function
  const updateValues = useCallback(
    (newValues: Record<string, unknown>) => {
      // Merge with existing values
      const mergedValues = { ...values, ...newValues };
      setValues(mergedValues);
      pendingValuesRef.current = mergedValues;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new debounced save
      saveTimeoutRef.current = setTimeout(() => {
        if (pendingValuesRef.current) {
          saveDraft(pendingValuesRef.current);
        }
      }, debounceMs);
    },
    [values, debounceMs, saveDraft]
  );

  // Submit function
  const submitForm = useCallback(async () => {
    try {
      setStatus("submitting");

      // First save any pending changes
      if (pendingValuesRef.current) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        await saveDraft(pendingValuesRef.current);
      }

      // Then submit
      const response = await fetch(`/api/submissions/${formConfigId}/draft`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to submit form: ${response.statusText}`);
      }

      if (isMountedRef.current) {
        setStatus("submitted");
        onSubmitSuccess?.();
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        setStatus("error");
        onError?.(error);
      }
    }
  }, [formConfigId, saveDraft, onError, onSubmitSuccess]);

  // Clear draft function
  const clearDraft = useCallback(async () => {
    try {
      const response = await fetch(`/api/submissions/${formConfigId}/draft`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to clear draft: ${response.statusText}`);
      }

      if (isMountedRef.current) {
        setValues({});
        setStatus("idle");
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        onError?.(error);
      }
    }
  }, [formConfigId, onError]);

  return {
    values,
    isLoading,
    status,
    error,
    updateValues,
    submitForm,
    clearDraft,
  };
}
