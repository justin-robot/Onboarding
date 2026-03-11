"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Title,
  Text,
  Divider,
  Switch,
  Button,
  List,
  ListItem,
} from "@tremor/react";
import { CheckSquare, Calendar, FileText, Video, Loader2 } from "lucide-react";
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
      <Title>Notification Preferences</Title>
      <Text>Choose which notifications you want to receive</Text>

      <List className="mt-6">
        {(
          Object.entries(NOTIFICATION_CATEGORIES) as [
            keyof typeof NOTIFICATION_CATEGORIES,
            (typeof NOTIFICATION_CATEGORIES)[keyof typeof NOTIFICATION_CATEGORIES],
          ][]
        ).map(([key, category]) => {
          const Icon = CATEGORY_ICONS[key];
          return (
            <ListItem key={key} className="py-4">
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-lg bg-tremor-background-subtle dark:bg-dark-tremor-background-subtle">
                  <Icon className="h-5 w-5 text-tremor-content dark:text-dark-tremor-content" />
                </div>
                <div>
                  <Text className="font-medium">{category.label}</Text>
                  <Text className="text-tremor-content-subtle dark:text-dark-tremor-content-subtle">
                    {category.description}
                  </Text>
                </div>
              </div>
              <Switch
                id={key}
                checked={preferences[key]}
                onChange={() => handleToggle(key)}
              />
            </ListItem>
          );
        })}
      </List>

      <Divider />

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={isSubmitting || !hasChanges}
          loading={isSubmitting}
          loadingText="Saving..."
        >
          Save Preferences
        </Button>
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={isSubmitting || !hasChanges}
        >
          Cancel
        </Button>
      </div>
    </Card>
  );
}
