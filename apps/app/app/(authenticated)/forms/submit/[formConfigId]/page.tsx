"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FormRenderer } from "@repo/design/components/form-builder/form-renderer";
import { useFormDraft, type DraftStatus } from "@repo/design/components/form-builder/use-form-draft";
import type { FormPage, FormElement } from "@repo/design/components/form-builder/types";
import { Button } from "@repo/design/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design/components/ui/card";
import { Alert, AlertDescription } from "@repo/design/components/ui/alert";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  Save,
  FileText,
} from "lucide-react";
import { cn } from "@repo/design/lib/utils";
import { toast } from "sonner";

interface FormConfig {
  id: string;
  taskId: string;
  pages: FormPage[];
}

// Status indicator component
function DraftStatusBadge({ status }: { status: DraftStatus }) {
  const statusConfig: Record<DraftStatus, { icon: React.ReactNode; text: string; className: string }> = {
    idle: { icon: null, text: "", className: "" },
    loading: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      text: "Loading...",
      className: "text-muted-foreground",
    },
    saving: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      text: "Saving...",
      className: "text-muted-foreground",
    },
    saved: {
      icon: <CheckCircle className="h-3 w-3" />,
      text: "Saved",
      className: "text-green-600",
    },
    error: {
      icon: <AlertCircle className="h-3 w-3" />,
      text: "Error saving",
      className: "text-destructive",
    },
    submitting: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      text: "Submitting...",
      className: "text-muted-foreground",
    },
    submitted: {
      icon: <CheckCircle className="h-3 w-3" />,
      text: "Submitted",
      className: "text-green-600",
    },
  };

  const config = statusConfig[status];
  if (!config.text) return null;

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", config.className)}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}

export default function FormSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const formConfigId = params.formConfigId as string;

  // Form config state
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  // Current page for multi-page forms
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Draft management hook
  const {
    values,
    isLoading: draftLoading,
    status,
    error: draftError,
    updateValues,
    submitForm,
  } = useFormDraft({
    formConfigId,
    debounceMs: 500,
    onError: (error) => {
      toast.error(error.message);
    },
    onSubmitSuccess: () => {
      toast.success("Form submitted successfully!");
      // Navigate back after short delay
      setTimeout(() => {
        router.back();
      }, 1500);
    },
  });

  // Fetch form config on mount
  useEffect(() => {
    const fetchFormConfig = async () => {
      try {
        setLoadingConfig(true);
        setConfigError(null);

        const response = await fetch(`/api/forms/config/${formConfigId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Form not found");
          }
          throw new Error("Failed to load form");
        }

        const data = await response.json();
        setFormConfig(data);
      } catch (err) {
        console.error("Error fetching form config:", err);
        setConfigError(err instanceof Error ? err.message : "Failed to load form");
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchFormConfig();
  }, [formConfigId]);

  // Handle form submission
  const handleSubmit = async (data: Record<string, unknown>) => {
    // Save the final values
    updateValues(data);

    // If multi-page and not on last page, go to next page
    if (formConfig && currentPageIndex < formConfig.pages.length - 1) {
      setCurrentPageIndex((prev) => prev + 1);
      return;
    }

    // Submit the form
    await submitForm();
  };

  // Navigate between pages
  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
    }
  };

  const goToNextPage = () => {
    if (formConfig && currentPageIndex < formConfig.pages.length - 1) {
      setCurrentPageIndex((prev) => prev + 1);
    }
  };

  // Loading state
  if (loadingConfig || draftLoading) {
    return (
      <div className="flex h-full overflow-y-auto items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (configError) {
    return (
      <div className="flex h-full overflow-y-auto items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{configError}</AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No form config
  if (!formConfig || formConfig.pages.length === 0) {
    return (
      <div className="flex h-full overflow-y-auto items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              This form has no content yet.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already submitted
  if (status === "submitted") {
    return (
      <div className="flex h-full overflow-y-auto items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-4 text-lg font-semibold">Form Submitted</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your response has been recorded.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPage = formConfig.pages[currentPageIndex];
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex === formConfig.pages.length - 1;
  const hasMultiplePages = formConfig.pages.length > 1;

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {hasMultiplePages && (
              <div className="text-sm text-muted-foreground">
                Page {currentPageIndex + 1} of {formConfig.pages.length}
              </div>
            )}
          </div>
          <DraftStatusBadge status={status} />
        </div>
      </header>

      {/* Form content */}
      <main className="container max-w-2xl px-4 py-12 min-h-[calc(100vh-3.5rem)] flex flex-col justify-center">
        <Card>
          <CardHeader>
            <CardTitle>{currentPage?.title || "Form"}</CardTitle>
          </CardHeader>
          <CardContent>
            {draftError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{draftError.message}</AlertDescription>
              </Alert>
            )}

            <FormRenderer
              key={`page-${currentPageIndex}`}
              elements={currentPage?.elements || []}
              onSubmit={handleSubmit}
              defaultValues={values}
              submitButtonText={isLastPage ? "Submit" : "Next"}
              showSubmitButton={true}
            />

            {/* Multi-page navigation */}
            {hasMultiplePages && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <Button
                  variant="outline"
                  onClick={goToPreviousPage}
                  disabled={isFirstPage || status === "submitting"}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                {/* Page indicators */}
                <div className="flex gap-1.5">
                  {formConfig.pages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPageIndex(index)}
                      className={cn(
                        "h-2 w-2 rounded-full transition-colors",
                        index === currentPageIndex
                          ? "bg-primary"
                          : "bg-muted hover:bg-muted-foreground/30"
                      )}
                      aria-label={`Go to page ${index + 1}`}
                    />
                  ))}
                </div>

                {!isLastPage && (
                  <Button
                    variant="outline"
                    onClick={goToNextPage}
                    disabled={status === "submitting"}
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                {isLastPage && <div className="w-24" />}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
