"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@repo/design/lib/utils";
import { Button } from "@repo/design/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Building2,
  CheckSquare,
  Mail,
  FileText,
  ChevronLeft,
  ChevronRight,
  LayoutTemplate,
  UserPlus,
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
  { label: "Templates", href: "/dashboard/templates", icon: LayoutTemplate, resource: "templates" },
  { label: "Tasks", href: "/dashboard/tasks", icon: CheckSquare, resource: "tasks" },
  { label: "Members", href: "/dashboard/members", icon: UserPlus, resource: "members" },
  { label: "Invitations", href: "/dashboard/invitations", icon: Mail, resource: "invitations" },
  { label: "Audit Logs", href: "/dashboard/audit-logs", icon: FileText, resource: "audit-logs" },
];

// Map path segments to display names
const segmentLabels: Record<string, string> = {
  dashboard: "Admin",
  users: "Users",
  workspaces: "Workspaces",
  templates: "Templates",
  tasks: "Tasks",
  members: "Members",
  invitations: "Invitations",
  "audit-logs": "Audit Logs",
  create: "Create",
};

interface BreadcrumbItem {
  label: string;
  href: string;
}

function AdminBreadcrumb({ pathname }: { pathname: string }) {
  // Build breadcrumb items from pathname
  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [];

  // Always start with Admin
  items.push({ label: "Admin", href: "/dashboard" });

  // Add subsequent segments
  let currentPath = "";
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip "dashboard" as it's already represented by "Admin"
    if (segment === "dashboard") continue;

    // Get the label for this segment
    let label = segmentLabels[segment];

    // If no predefined label, it might be an ID (like user ID or workspace ID)
    // We'll show a truncated version or skip it for now
    if (!label) {
      // Check if it looks like a UUID or ID
      if (segment.length > 8 && !segment.includes("-")) {
        // Numeric or short ID - skip for now (will be handled by detail pages)
        continue;
      }
      if (segment.includes("-") && segment.length > 20) {
        // Looks like a UUID - show as "Details"
        label = "Details";
      } else {
        // Show capitalized segment
        label = segment.charAt(0).toUpperCase() + segment.slice(1);
      }
    }

    items.push({ label, href: currentPath });
  }

  // Don't show breadcrumb if only "Admin" (on overview page)
  if (items.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground px-6 py-3 border-b bg-muted/20">
      {items.map((item, index) => (
        <span key={item.href} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          )}
          {index === items.length - 1 ? (
            <span className="font-medium text-foreground">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

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
    <div className="flex h-full bg-background">
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
                onClick={() => router.push(item.href)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col">
        <AdminBreadcrumb pathname={pathname} />
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
