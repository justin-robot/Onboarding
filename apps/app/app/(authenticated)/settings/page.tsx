import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { userService } from "@/lib/services";
import { getUserPreferences } from "@repo/notifications/preferences";
import type { Metadata } from "next";
import { SettingsTabs } from "./settings-tabs";

export const metadata: Metadata = {
  title: "Account Settings",
  description: "Manage your account settings",
};

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  if (!session?.user) {
    redirect("/sign-in");
  }

  const [profile, notificationPreferences] = await Promise.all([
    userService.getProfile(session.user.id),
    getUserPreferences(session.user.id),
  ]);

  if (!profile) {
    redirect("/sign-in");
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="container max-w-2xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile and account preferences
          </p>
        </div>
        <SettingsTabs
          profile={profile}
          notificationPreferences={notificationPreferences}
          defaultTab={params.tab === "notifications" ? 1 : 0}
        />
      </div>
    </div>
  );
}
