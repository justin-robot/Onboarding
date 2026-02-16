import { database } from "../index";
import type { NotificationContext } from "./notificationContext";

// Meeting with upcoming start time
export interface UpcomingMeeting {
  bookingId: string;
  taskId: string;
  taskTitle: string;
  workspaceId: string;
  workspaceName: string;
  meetLink: string;
  bookedAt: Date;
  assigneeIds: string[];
}

// Result of processing meeting reminders
export interface MeetingReminderResult {
  meetingsFound: number;
  notificationsSent: number;
  errors: string[];
}

export const meetingReminderService = {
  /**
   * Get bookings with meetings starting within the specified minutes
   * Only returns bookings that have a meetLink set
   */
  async getUpcomingMeetings(minutesThreshold: number = 15): Promise<UpcomingMeeting[]> {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + minutesThreshold * 60 * 1000);

    // Find bookings where:
    // - meetLink is not null (has a meeting)
    // - bookedAt is not null
    // - bookedAt is between now and threshold
    // - task is not completed
    const bookings = await database
      .selectFrom("booking")
      .innerJoin("time_booking_config", "time_booking_config.id", "booking.configId")
      .innerJoin("task", "task.id", "time_booking_config.taskId")
      .innerJoin("section", "section.id", "task.sectionId")
      .innerJoin("workspace", "workspace.id", "section.workspaceId")
      .select([
        "booking.id as bookingId",
        "booking.meetLink",
        "booking.bookedAt",
        "task.id as taskId",
        "task.title as taskTitle",
        "workspace.id as workspaceId",
        "workspace.name as workspaceName",
      ])
      .where("booking.meetLink", "is not", null)
      .where("booking.bookedAt", "is not", null)
      .where("booking.bookedAt", ">", now)
      .where("booking.bookedAt", "<=", thresholdDate)
      .where("task.status", "!=", "completed")
      .where("task.deletedAt", "is", null)
      .execute();

    // Get assignees for each meeting's task
    const result: UpcomingMeeting[] = [];
    for (const booking of bookings) {
      const assignees = await database
        .selectFrom("task_assignee")
        .select("userId")
        .where("taskId", "=", booking.taskId)
        .execute();

      result.push({
        bookingId: booking.bookingId,
        taskId: booking.taskId,
        taskTitle: booking.taskTitle,
        workspaceId: booking.workspaceId,
        workspaceName: booking.workspaceName,
        meetLink: booking.meetLink!,
        bookedAt: booking.bookedAt!,
        assigneeIds: assignees.map((a) => a.userId),
      });
    }

    return result;
  },

  /**
   * Process all meeting reminders
   * Finds meetings starting soon and triggers notifications
   */
  async processReminders(
    notificationContext: NotificationContext,
    options: { minutesThreshold?: number } = {}
  ): Promise<MeetingReminderResult> {
    const minutesThreshold = options.minutesThreshold ?? 15;
    const result: MeetingReminderResult = {
      meetingsFound: 0,
      notificationsSent: 0,
      errors: [],
    };

    const now = new Date();

    // Get upcoming meetings
    const meetings = await this.getUpcomingMeetings(minutesThreshold);
    result.meetingsFound = meetings.length;

    for (const meeting of meetings) {
      const startsIn = Math.round(
        (meeting.bookedAt.getTime() - now.getTime()) / (1000 * 60)
      );

      for (const assigneeId of meeting.assigneeIds) {
        try {
          await notificationContext.triggerWorkflow({
            workflowId: "meeting-starting",
            recipientId: assigneeId,
            data: {
              workspaceId: meeting.workspaceId,
              workspaceName: meeting.workspaceName,
              taskId: meeting.taskId,
              taskTitle: meeting.taskTitle,
              meetingLink: meeting.meetLink,
              startsIn,
            },
            tenant: meeting.workspaceId,
          });
          result.notificationsSent++;
        } catch (error) {
          result.errors.push(
            `Failed to notify ${assigneeId} for meeting ${meeting.bookingId}: ${error}`
          );
        }
      }
    }

    return result;
  },
};
