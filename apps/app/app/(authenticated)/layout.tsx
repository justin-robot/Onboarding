import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PendingInviteHandler } from "./components/pending-invite-handler";
import { NotificationsWrapper } from "./components/notifications-wrapper";

type AppLayoutProperties = {
  readonly children: ReactNode;
};

const AppLayout = async ({ children }: AppLayoutProperties) => {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <main className="h-screen overflow-hidden bg-background">
      <PendingInviteHandler />
      <NotificationsWrapper userId={session.user.id}>
        {children}
      </NotificationsWrapper>
    </main>
  );
};

export default AppLayout;
