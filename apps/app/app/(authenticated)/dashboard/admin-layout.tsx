"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@repo/design/lib/utils";
import { Button } from "@repo/design/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Building2,
  CheckSquare,
  UserPlus,
  Mail,
  FileText,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import type { ReactNode } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  resource?: string;
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/dashboard/users", icon: Users, resource: "users" },
  { label: "Workspaces", href: "/dashboard/workspaces", icon: Building2, resource: "workspaces" },
  { label: "Tasks", href: "/dashboard/tasks", icon: CheckSquare, resource: "tasks" },
  { label: "Members", href: "/dashboard/members", icon: UserPlus, resource: "members" },
  { label: "Invitations", href: "/dashboard/invitations", icon: Mail, resource: "invitations" },
  { label: "Audit Logs", href: "/dashboard/audit-logs", icon: FileText, resource: "audit-logs" },
];

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/workspaces")}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold text-lg">Admin</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Button
                key={item.href}
                variant={active ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  active && "bg-secondary"
                )}
                onClick={() => {
                  if (item.resource) {
                    // React Admin handles routing internally
                    router.push(item.href);
                  } else {
                    router.push(item.href);
                  }
                }}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={() => router.push("/workspaces")}
          >
            <LogOut className="h-4 w-4" />
            Exit Admin
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
