"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FormBuilder,
  type FormConfig,
  type FormPage,
} from "@repo/design/components/form-builder";
import { Button } from "@repo/design/components/ui/button";
import { Alert, AlertDescription } from "@repo/design/components/ui/alert";
import {
  ArrowLeft,
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function FormEditorPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [config, setConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [hasChanges, setHasChanges] = useState(false);

  // Load form config
  useEffect(() => {
    const loadForm = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/forms/${taskId}`);
        if (!response.ok) {
          throw new Error("Failed to load form");
        }

        const data = await response.json();

        // If no pages exist, create an empty config
        if (!data.pages || data.pages.length === 0) {
          setConfig({
            id: data.id || `temp_${taskId}`,
            taskId,
            pages: [
              {
                id: `page_${Date.now()}`,
                title: "Page 1",
                position: 0,
                elements: [],
              },
            ],
          });
        } else {
          setConfig({
            id: data.id,
            taskId,
            pages: data.pages,
          });
        }
      } catch (err) {
        console.error("Error loading form:", err);
        setError(err instanceof Error ? err.message : "Failed to load form");
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [taskId]);

  // Handle config changes
  const handleConfigChange = useCallback((newConfig: FormConfig) => {
    setConfig(newConfig);
    setHasChanges(true);
    setSaveStatus("idle");
  }, []);

  // Save form
  const handleSave = async () => {
    if (!config) return;

    setSaveStatus("saving");

    try {
      const response = await fetch(`/api/forms/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: config.pages }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save form");
      }

      setSaveStatus("saved");
      setHasChanges(false);
      toast.success("Form saved");

      // Reset status after 2 seconds
      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (err) {
      console.error("Error saving form:", err);
      setSaveStatus("error");
      toast.error(err instanceof Error ? err.message : "Failed to save form");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading form builder...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex-shrink-0 border-b px-4 py-3 bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Form Builder</h1>
              <p className="text-xs text-muted-foreground">
                Drag elements to build your form
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Save status indicator */}
            <div className="flex items-center gap-1.5 text-sm">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Saving...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Saved</span>
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">Error</span>
                </>
              )}
            </div>
            <Button
              onClick={handleSave}
              disabled={saveStatus === "saving" || !hasChanges}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Form
            </Button>
          </div>
        </div>
      </header>

      {/* Form Builder */}
      <div className="flex-1 min-h-0">
        <FormBuilder
          config={config}
          onConfigChange={handleConfigChange}
          className="h-full"
        />
      </div>
    </div>
  );
}
