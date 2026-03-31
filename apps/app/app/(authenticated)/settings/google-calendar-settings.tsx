"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Title,
  Text,
  Button,
} from "@tremor/react";
import { Loader2, Unplug, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design/components/ui/alert-dialog";

interface GoogleCalendarIntegration {
  id: string;
  workspaceId: string;
  workspaceName: string;
  accountEmail: string | null;
  connectedAt: string;
}

export function GoogleCalendarSettings() {
  const [integrations, setIntegrations] = useState<GoogleCalendarIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<GoogleCalendarIntegration | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  async function fetchIntegrations() {
    try {
      const response = await fetch("/api/user/integrations/google");
      if (!response.ok) throw new Error("Failed to fetch integrations");
      const data = await response.json();
      setIntegrations(data.integrations);
    } catch (error) {
      console.error("Error fetching Google Calendar integrations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect(integration: GoogleCalendarIntegration) {
    setDisconnecting(integration.id);
    try {
      const response = await fetch("/api/user/integrations/google", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: integration.workspaceId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to disconnect");
      }

      setIntegrations((prev) => prev.filter((i) => i.id !== integration.id));
      toast.success(`Disconnected Google Calendar from ${integration.workspaceName}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to disconnect"
      );
    } finally {
      setDisconnecting(null);
      setConfirmDisconnect(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <Title>Google Calendar</Title>
        <Text>Manage your Google Calendar connections</Text>
        <div className="mt-4 flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <Title>Google Calendar</Title>
        </div>
        <Text>Manage your Google Calendar connections across workspaces</Text>

        <div className="mt-4">
          {integrations.length === 0 ? (
            <Text className="text-tremor-content-subtle dark:text-dark-tremor-content-subtle py-4">
              No Google Calendar connections found. You can connect Google Calendar from within a workspace.
            </Text>
          ) : (
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div>
                    <Text className="font-medium">{integration.workspaceName}</Text>
                    {integration.accountEmail && (
                      <Text className="text-sm text-tremor-content-subtle dark:text-dark-tremor-content-subtle">
                        {integration.accountEmail}
                      </Text>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={disconnecting === integration.id ? Loader2 : Unplug}
                    onClick={() => setConfirmDisconnect(integration)}
                    disabled={disconnecting === integration.id}
                  >
                    {disconnecting === integration.id ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <AlertDialog open={!!confirmDisconnect} onOpenChange={() => setConfirmDisconnect(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Google Calendar?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect Google Calendar from <strong>{confirmDisconnect?.workspaceName}</strong>.
              Meeting scheduling features will no longer work in this workspace until reconnected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!disconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDisconnect && handleDisconnect(confirmDisconnect)}
              disabled={!!disconnecting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
