import { requireAuth, withErrorHandler, json, errorResponse } from "../../_lib/api-utils";
import {
  getUserPreferences,
  updateUserPreferences,
  type NotificationPreferences,
} from "@repo/notifications/preferences";
import { z } from "zod";

const updatePreferencesSchema = z.object({
  tasks: z.boolean(),
  dueDates: z.boolean(),
  documents: z.boolean(),
  meetings: z.boolean(),
});

export async function GET() {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const preferences = await getUserPreferences(user.id);
    return json(preferences);
  });
}

export async function PUT(request: Request) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const body = await request.json();

    const parsed = updatePreferencesSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message ?? "Invalid input", 400);
    }

    const preferences: NotificationPreferences = parsed.data;
    const updated = await updateUserPreferences(user.id, preferences);
    return json(updated);
  });
}
