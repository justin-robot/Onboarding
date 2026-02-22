"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design/components/ui/card";
import { Badge } from "@repo/design/components/ui/badge";
import { Separator } from "@repo/design/components/ui/separator";
import { Loader2, FileText, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@repo/design/components/ui/button";
import { cn } from "@repo/design/lib/utils";
import { formatFullTimestamp } from "@repo/design/lib/date-utils";

// Types for the API response
interface FormElement {
  id: string;
  type: string;
  label: string;
  options?: Array<{ label: string; value: string }> | null;
  position: number;
}

interface FormPage {
  id: string;
  title: string;
  position: number;
  elements: FormElement[];
}

interface SubmissionData {
  submission: {
    id: string;
    status: string;
    submittedAt: string;
    createdAt: string;
  };
  values: Record<string, string | string[] | null>;
  formConfig: {
    id: string;
    pages: FormPage[];
  };
}

interface FormSubmissionViewerProps {
  formConfigId: string;
  userId?: string; // Optional: view a specific user's submission (for admins)
  userName?: string; // Optional: display name for the user
  onBack?: () => void; // Optional: callback to go back (when viewing another user's submission)
  className?: string;
}

export function FormSubmissionViewer({
  formConfigId,
  userId,
  userName,
  onBack,
  className,
}: FormSubmissionViewerProps) {
  const [data, setData] = useState<SubmissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const url = userId
          ? `/api/submissions/${formConfigId}/submitted?userId=${userId}`
          : `/api/submissions/${formConfigId}/submitted`;
        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 404) {
            setError("No submission found");
          } else {
            setError("Failed to load submission");
          }
          return;
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching submission:", err);
        setError("Failed to load submission");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [formConfigId]);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className={cn(
          "rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-900/30 dark:bg-green-950/20",
          className
        )}
      >
        <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
        <p className="mt-2 text-sm font-medium text-green-700 dark:text-green-400">
          This task has been completed
        </p>
      </div>
    );
  }

  // Filter out display-only elements (heading, paragraph, image, divider)
  const displayOnlyTypes = ["heading", "paragraph", "image", "divider"];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            className="w-fit -ml-2 mb-2 text-muted-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            <CardTitle className="text-base">Form Submission</CardTitle>
          </div>
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          >
            Submitted
          </Badge>
        </div>
        <CardDescription>
          {userName ? `${userName} submitted` : "Submitted"} {formatFullTimestamp(data.submission.submittedAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.formConfig.pages.map((page, pageIndex) => (
          <div key={page.id}>
            {data.formConfig.pages.length > 1 && (
              <>
                {pageIndex > 0 && <Separator className="my-4" />}
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {page.title}
                </h3>
              </>
            )}
            <div className="space-y-3">
              {page.elements
                .filter((el) => !displayOnlyTypes.includes(el.type))
                .map((element) => (
                  <FieldDisplay
                    key={element.id}
                    element={element}
                    value={data.values[element.id]}
                  />
                ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface FieldDisplayProps {
  element: FormElement;
  value: string | string[] | null | undefined;
}

function FieldDisplay({ element, value }: FieldDisplayProps) {
  const displayValue = formatFieldValue(element, value);

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <dt className="text-xs font-medium text-muted-foreground mb-1">
        {element.label}
      </dt>
      <dd className="text-sm text-foreground">
        {displayValue || (
          <span className="text-muted-foreground italic">Not provided</span>
        )}
      </dd>
    </div>
  );
}

function formatFieldValue(
  element: FormElement,
  value: string | string[] | null | undefined
): string | React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  switch (element.type) {
    case "checkbox":
      // Checkbox values are arrays - show as comma-separated list with labels
      if (Array.isArray(value) && element.options) {
        const labels = value
          .map((v) => {
            const option = element.options?.find((opt) => opt.value === v);
            return option?.label || v;
          })
          .filter(Boolean);
        return labels.join(", ");
      }
      return Array.isArray(value) ? value.join(", ") : String(value);

    case "select":
    case "radio":
      // Find the label for the selected option
      if (element.options) {
        const option = element.options.find((opt) => opt.value === value);
        return option?.label || String(value);
      }
      return String(value);

    case "date":
      // Format date nicely
      try {
        const date = new Date(value as string);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch {
        return String(value);
      }

    case "file":
      // For file uploads, just show the filename
      return (
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {String(value)}
        </span>
      );

    case "textarea":
      // Preserve line breaks in textarea
      return (
        <span className="whitespace-pre-wrap">{String(value)}</span>
      );

    default:
      // text, number, email, phone - just show the value
      return String(value);
  }
}
