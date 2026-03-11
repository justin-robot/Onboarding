"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from "@tremor/react";
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
        className="inline-flex items-center text-sm text-tremor-content hover:text-tremor-content-strong transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Workspaces
      </Link>

      <TabGroup>
        <TabList variant="line">
          <Tab>Profile</Tab>
          <Tab>Notifications</Tab>
        </TabList>
        <TabPanels>
          <TabPanel className="mt-6">
            <SettingsForm initialProfile={profile} />
          </TabPanel>
          <TabPanel className="mt-6">
            <NotificationPreferences initialPreferences={notificationPreferences} />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
