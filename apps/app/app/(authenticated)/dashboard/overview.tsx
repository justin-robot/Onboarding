"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design/components/ui/card";
import { Skeleton } from "@repo/design/components/ui/skeleton";
import {
  Users,
  Building2,
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Mail,
  UserPlus,
} from "lucide-react";

interface Stats {
  users: { total: number };
  workspaces: { total: number };
  tasks: {
    total: number;
    byStatus: {
      not_started?: number;
      in_progress?: number;
      completed?: number;
    };
  };
  invitations: { pending: number };
  members: { total: number };
}

export function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/stats", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch stats");
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center text-red-500">
          <AlertCircle className="mx-auto h-12 w-12 mb-4" />
          <p>Error loading dashboard: {error}</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.users.total || 0,
      icon: Users,
      color: "text-blue-600",
      href: "/dashboard/users",
      testId: "stat-card-users",
    },
    {
      title: "Workspaces",
      value: stats?.workspaces.total || 0,
      icon: Building2,
      color: "text-purple-600",
      href: "/dashboard/workspaces",
      testId: "stat-card-workspaces",
    },
    {
      title: "Total Tasks",
      value: stats?.tasks.total || 0,
      icon: CheckSquare,
      color: "text-green-600",
      href: "/dashboard/tasks",
      testId: "stat-card-tasks",
    },
    {
      title: "Workspace Members",
      value: stats?.members.total || 0,
      icon: UserPlus,
      color: "text-orange-600",
      href: "/dashboard/members",
      testId: "stat-card-members",
    },
    {
      title: "Not Started",
      value: stats?.tasks.byStatus?.not_started || 0,
      icon: Clock,
      color: "text-gray-500",
      description: "Tasks",
      href: "/dashboard/tasks?status=not_started",
      testId: "stat-card-not-started",
    },
    {
      title: "In Progress",
      value: stats?.tasks.byStatus?.in_progress || 0,
      icon: AlertCircle,
      color: "text-yellow-600",
      description: "Tasks",
      href: "/dashboard/tasks?status=in_progress",
      testId: "stat-card-in-progress",
    },
    {
      title: "Completed",
      value: stats?.tasks.byStatus?.completed || 0,
      icon: CheckCircle2,
      color: "text-green-600",
      description: "Tasks",
      href: "/dashboard/tasks?status=completed",
      testId: "stat-card-completed",
    },
    {
      title: "Pending Invitations",
      value: stats?.invitations.pending || 0,
      icon: Mail,
      color: "text-blue-500",
      description: "Invitations",
      href: "/dashboard/invitations",
      testId: "stat-card-invitations",
    },
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          System overview and statistics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href} data-testid={stat.testId}>
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                  {stat.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Use the sidebar to navigate to different admin sections.
            </p>
            <ul className="text-sm space-y-1">
              <li>• <strong>Users</strong> - Manage user accounts and roles</li>
              <li>• <strong>Workspaces</strong> - View and manage all workspaces</li>
              <li>• <strong>Tasks</strong> - Monitor task progress across workspaces</li>
              <li>• <strong>Members</strong> - Manage workspace memberships</li>
              <li>• <strong>Invitations</strong> - View pending invitations</li>
              <li>• <strong>Audit Logs</strong> - Review system activity</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.tasks.total ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Not Started</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className="bg-gray-400 h-2 rounded-full"
                        style={{
                          width: `${((stats.tasks.byStatus?.not_started || 0) / stats.tasks.total) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">
                      {stats.tasks.byStatus?.not_started || 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">In Progress</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{
                          width: `${((stats.tasks.byStatus?.in_progress || 0) / stats.tasks.total) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">
                      {stats.tasks.byStatus?.in_progress || 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Completed</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${((stats.tasks.byStatus?.completed || 0) / stats.tasks.total) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">
                      {stats.tasks.byStatus?.completed || 0}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tasks found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DashboardOverview;
