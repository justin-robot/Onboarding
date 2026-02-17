import { NextResponse } from "next/server";
import { meetingReminderService, type NotificationContext } from "@/lib/services";
import { notificationService } from "@repo/notifications";
import { verifyCronSecret } from "../../_lib/cron-auth";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notificationContext: NotificationContext = {
      triggerWorkflow: async (options) => {
        return notificationService.triggerWorkflow({
          workflowId: options.workflowId as Parameters<typeof notificationService.triggerWorkflow>[0]["workflowId"],
          recipientId: options.recipientId,
          data: options.data as Parameters<typeof notificationService.triggerWorkflow>[0]["data"],
          tenant: options.tenant,
        });
      },
    };

    const result = await meetingReminderService.processReminders(notificationContext, {
      minutesThreshold: 15,
    });

    console.log("[cron/meeting-reminders] Processed:", {
      meetingsFound: result.meetingsFound,
      notificationsSent: result.notificationsSent,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[cron/meeting-reminders] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
