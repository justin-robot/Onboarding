"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design/components/ui/tabs";
import { SettingsForm } from "./settings-form";
import { NotificationPreferences } from "./notification-preferences";
import type { UserProfile } from "@/lib/services";
import type { NotificationPreferences as NotificationPrefsType } from "@repo/notifications/preferences";

interface SettingsTabsProps {
  profile: UserProfile;
  notificationPreferences: NotificationPrefsType;
}

export function SettingsTabs({
  profile,
  notificationPreferences,
}: SettingsTabsProps) {
  return (
    <div className="space-y-6">
      <Link
        href="/workspaces"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Workspaces
      </Link>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <SettingsForm initialProfile={profile} />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationPreferences initialPreferences={notificationPreferences} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
