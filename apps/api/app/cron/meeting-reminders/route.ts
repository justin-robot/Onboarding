import { NextResponse } from "next/server";
import { meetingReminderService, type NotificationContext } from "@repo/database";
import { notificationService } from "@repo/notifications";

// Vercel Cron configuration
// Add to vercel.json:
// {
//   "crons": [
//     {
//       "path": "/cron/meeting-reminders",
//       "schedule": "*/5 * * * *"
//     }
//   ]
// }

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // If no secret configured, allow in development
  if (!cronSecret) {
    return process.env.NODE_ENV === "development";
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Create notification context using the notification service
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

    // Process reminders with 15-minute threshold
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

// Support POST for manual triggers
export async function POST(request: Request) {
  return GET(request);
}
