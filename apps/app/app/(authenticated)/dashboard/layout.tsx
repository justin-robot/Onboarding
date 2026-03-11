import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { adminAccessService } from "@/lib/services";

type DashboardLayoutProperties = {
  readonly children: ReactNode;
};

const DashboardLayout = async ({ children }: DashboardLayoutProperties) => {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  if (!session?.user) {
    redirect("/sign-in");
  }

  // Check if user can access admin panel
  // Either: isPlatformAdmin = true OR is workspace admin somewhere
  const access = await adminAccessService.checkAccess(session.user.id);

  if (!access.canAccess) {
    redirect("/");
  }

  return <>{children}</>;
};

export default DashboardLayout;
