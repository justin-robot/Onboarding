"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/design/components/ui/button";
import { Switch } from "@repo/design/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design/components/ui/card";
import { Label } from "@repo/design/components/ui/label";
import { Loader2, CheckSquare, Calendar, FileText, Video } from "lucide-react";
import { toast } from "sonner";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationPreferences as NotificationPrefsType,
} from "@repo/notifications/preferences";

interface NotificationPreferencesProps {
  initialPreferences: NotificationPrefsType;
}

const CATEGORY_ICONS = {
  tasks: CheckSquare,
  dueDates: Calendar,
  documents: FileText,
  meetings: Video,
} as const;

export function NotificationPreferences({
  initialPreferences,
}: NotificationPreferencesProps) {
  const router = useRouter();
  const [preferences, setPreferences] =
    useState<NotificationPrefsType>(initialPreferences);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasChanges =
    preferences.tasks !== initialPreferences.tasks ||
    preferences.dueDates !== initialPreferences.dueDates ||
    preferences.documents !== initialPreferences.documents ||
    preferences.meetings !== initialPreferences.meetings;

  function handleToggle(category: keyof NotificationPrefsType) {
    setPreferences((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }

  async function handleSave() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/user/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update preferences");
      }

      toast.success("Notification preferences updated");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update notification preferences"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    setPreferences(initialPreferences);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose which notifications you want to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {(
          Object.entries(NOTIFICATION_CATEGORIES) as [
            keyof typeof NOTIFICATION_CATEGORIES,
            (typeof NOTIFICATION_CATEGORIES)[keyof typeof NOTIFICATION_CATEGORIES],
          ][]
        ).map(([key, category]) => {
          const Icon = CATEGORY_ICONS[key];
          return (
            <div
              key={key}
              className="flex items-center justify-between space-x-4"
            >
              <div className="flex items-start space-x-4">
                <div className="p-2 rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-0.5">
                  <Label htmlFor={key} className="text-base font-medium">
                    {category.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </div>
              </div>
              <Switch
                id={key}
                checked={preferences[key]}
                onCheckedChange={() => handleToggle(key)}
              />
            </div>
          );
        })}

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} disabled={isSubmitting || !hasChanges}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting || !hasChanges}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
