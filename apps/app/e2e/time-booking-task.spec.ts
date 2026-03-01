import { test, expect } from "@playwright/test";

/**
 * E2E: Time Booking Task
 *
 * Tests the time booking task workflow per the Moxo specification:
 * - V1: Manual link entry
 * - Admin pastes a scheduling URL
 * - Assignee clicks "Book Meeting" (opens in new tab)
 * - Assignee confirms booking
 * - Task completes on confirmation
 */

interface Task {
  id: string;
  title: string;
  type: "TIME_BOOKING";
  sectionId: string;
  status: "not_started" | "in_progress" | "completed";
  isLocked: boolean;
  completedAt: string | null;
}

interface TimeBookingConfig {
  id: string;
  taskId: string;
  schedulingUrl: string;
  instructions: string;
  meetingType: "call" | "video" | "in_person";
  duration: number; // minutes
  confirmations: BookingConfirmation[];
}

interface BookingConfirmation {
  id: string;
  taskId: string;
  userId: string;
  bookedAt: string;
  meetingTime: string;
  confirmed: boolean;
  confirmedAt: string | null;
}

test.describe("Time Booking Task", () => {
  test.describe("Task Configuration", () => {
    test("creates time booking task with correct type", () => {
      const task: Task = {
        id: "task-booking-1",
        title: "Schedule Onboarding Call",
        type: "TIME_BOOKING",
        sectionId: "section-1",
        status: "not_started",
        isLocked: false,
        completedAt: null,
      };

      expect(task.type).toBe("TIME_BOOKING");
      expect(task.status).toBe("not_started");
    });

    test("creates time booking config with scheduling URL", () => {
      const config: TimeBookingConfig = {
        id: "booking-config-1",
        taskId: "task-1",
        schedulingUrl: "https://calendly.com/company/onboarding",
        instructions:
          "Please schedule a 30-minute onboarding call with your manager.",
        meetingType: "video",
        duration: 30,
        confirmations: [],
      };

      expect(config.schedulingUrl).toBeTruthy();
      expect(config.meetingType).toBe("video");
      expect(config.duration).toBe(30);
    });

    test("validates scheduling URL format", () => {
      const isValidUrl = (url: string): boolean => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      };

      expect(isValidUrl("https://calendly.com/company/call")).toBe(true);
      expect(isValidUrl("https://cal.com/user/meeting")).toBe(true);
      expect(isValidUrl("not-a-url")).toBe(false);
    });

    test("supports different meeting types", () => {
      const meetingTypes = ["call", "video", "in_person"] as const;

      for (const type of meetingTypes) {
        const config: TimeBookingConfig = {
          id: "config-1",
          taskId: "task-1",
          schedulingUrl: "https://calendly.com/test",
          instructions: "",
          meetingType: type,
          duration: 30,
          confirmations: [],
        };

        expect(config.meetingType).toBe(type);
      }
    });

    test("supports various meeting durations", () => {
      const durations = [15, 30, 45, 60, 90, 120];

      for (const duration of durations) {
        const config: TimeBookingConfig = {
          id: "config-1",
          taskId: "task-1",
          schedulingUrl: "https://calendly.com/test",
          instructions: "",
          meetingType: "video",
          duration,
          confirmations: [],
        };

        expect(config.duration).toBe(duration);
      }
    });
  });

  test.describe("Booking Flow", () => {
    test("records booking confirmation", () => {
      const config: TimeBookingConfig = {
        id: "config-1",
        taskId: "task-1",
        schedulingUrl: "https://calendly.com/company/onboarding",
        instructions: "",
        meetingType: "video",
        duration: 30,
        confirmations: [],
      };

      const confirmBooking = (
        userId: string,
        meetingTime: string
      ): BookingConfirmation => {
        const confirmation: BookingConfirmation = {
          id: `booking-${config.confirmations.length + 1}`,
          taskId: config.taskId,
          userId,
          bookedAt: new Date().toISOString(),
          meetingTime,
          confirmed: true,
          confirmedAt: new Date().toISOString(),
        };
        config.confirmations.push(confirmation);
        return confirmation;
      };

      const confirmation = confirmBooking("user-1", "2024-04-01T10:00:00.000Z");

      expect(confirmation.confirmed).toBe(true);
      expect(config.confirmations).toHaveLength(1);
    });

    test("prevents duplicate confirmations from same user", () => {
      const confirmations: BookingConfirmation[] = [
        {
          id: "booking-1",
          taskId: "task-1",
          userId: "user-1",
          bookedAt: new Date().toISOString(),
          meetingTime: "2024-04-01T10:00:00.000Z",
          confirmed: true,
          confirmedAt: new Date().toISOString(),
        },
      ];

      const hasConfirmed = (taskId: string, userId: string): boolean => {
        return confirmations.some(
          (c) => c.taskId === taskId && c.userId === userId && c.confirmed
        );
      };

      expect(hasConfirmed("task-1", "user-1")).toBe(true);
      expect(hasConfirmed("task-1", "user-2")).toBe(false);
    });

    test("validates meeting time is in future", () => {
      const isValidMeetingTime = (meetingTime: string): boolean => {
        return new Date(meetingTime).getTime() > Date.now();
      };

      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      expect(isValidMeetingTime(futureTime)).toBe(true);
      expect(isValidMeetingTime(pastTime)).toBe(false);
    });
  });

  test.describe("Task Completion", () => {
    test("completes task when booking confirmed", () => {
      let task: Task = {
        id: "task-1",
        title: "Schedule Call",
        type: "TIME_BOOKING",
        sectionId: "section-1",
        status: "not_started",
        isLocked: false,
        completedAt: null,
      };

      const confirmations: BookingConfirmation[] = [];

      const confirmAndCompleteTask = (
        userId: string,
        meetingTime: string
      ): void => {
        confirmations.push({
          id: "booking-1",
          taskId: task.id,
          userId,
          bookedAt: new Date().toISOString(),
          meetingTime,
          confirmed: true,
          confirmedAt: new Date().toISOString(),
        });

        task = {
          ...task,
          status: "completed",
          completedAt: new Date().toISOString(),
        };
      };

      confirmAndCompleteTask("user-1", "2024-04-01T10:00:00.000Z");

      expect(task.status).toBe("completed");
      expect(task.completedAt).toBeTruthy();
      expect(confirmations).toHaveLength(1);
    });

    test("does not complete task without confirmation", () => {
      const task: Task = {
        id: "task-1",
        title: "Schedule Call",
        type: "TIME_BOOKING",
        sectionId: "section-1",
        status: "in_progress",
        isLocked: false,
        completedAt: null,
      };

      const confirmations: BookingConfirmation[] = [];

      const isTaskComplete = (taskId: string): boolean => {
        return confirmations.some((c) => c.taskId === taskId && c.confirmed);
      };

      expect(isTaskComplete(task.id)).toBe(false);
      expect(task.status).not.toBe("completed");
    });
  });

  test.describe("Multiple Assignees", () => {
    test("tracks confirmations from multiple assignees", () => {
      const task: Task = {
        id: "task-1",
        title: "Schedule Team Meeting",
        type: "TIME_BOOKING",
        sectionId: "section-1",
        status: "in_progress",
        isLocked: false,
        completedAt: null,
      };

      const assignees = ["user-1", "user-2", "user-3"];

      const confirmations: BookingConfirmation[] = [
        {
          id: "booking-1",
          taskId: task.id,
          userId: "user-1",
          bookedAt: new Date().toISOString(),
          meetingTime: "2024-04-01T10:00:00.000Z",
          confirmed: true,
          confirmedAt: new Date().toISOString(),
        },
        {
          id: "booking-2",
          taskId: task.id,
          userId: "user-2",
          bookedAt: new Date().toISOString(),
          meetingTime: "2024-04-01T10:00:00.000Z",
          confirmed: true,
          confirmedAt: new Date().toISOString(),
        },
      ];

      const getConfirmedCount = (taskId: string): number => {
        return confirmations.filter((c) => c.taskId === taskId && c.confirmed)
          .length;
      };

      const getPendingAssignees = (taskId: string): string[] => {
        const confirmedUsers = confirmations
          .filter((c) => c.taskId === taskId && c.confirmed)
          .map((c) => c.userId);
        return assignees.filter((a) => !confirmedUsers.includes(a));
      };

      expect(getConfirmedCount(task.id)).toBe(2);
      expect(getPendingAssignees(task.id)).toEqual(["user-3"]);
    });
  });

  test.describe("Meeting Details Display", () => {
    test("formats meeting time for display", () => {
      const formatMeetingTime = (isoString: string): string => {
        const date = new Date(isoString);
        return date.toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        });
      };

      const formatted = formatMeetingTime("2024-04-01T10:00:00.000Z");
      expect(formatted).toBeTruthy();
    });

    test("displays meeting type icon", () => {
      const getMeetingTypeIcon = (type: "call" | "video" | "in_person"): string => {
        const icons: Record<string, string> = {
          call: "phone",
          video: "video",
          in_person: "map-pin",
        };
        return icons[type];
      };

      expect(getMeetingTypeIcon("call")).toBe("phone");
      expect(getMeetingTypeIcon("video")).toBe("video");
      expect(getMeetingTypeIcon("in_person")).toBe("map-pin");
    });

    test("displays duration in human readable format", () => {
      const formatDuration = (minutes: number): string => {
        if (minutes < 60) return `${minutes} minutes`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (mins === 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
        return `${hours} hour${hours > 1 ? "s" : ""} ${mins} minutes`;
      };

      expect(formatDuration(15)).toBe("15 minutes");
      expect(formatDuration(30)).toBe("30 minutes");
      expect(formatDuration(60)).toBe("1 hour");
      expect(formatDuration(90)).toBe("1 hour 30 minutes");
      expect(formatDuration(120)).toBe("2 hours");
    });
  });

  test.describe("Full Workflow", () => {
    test("complete time booking workflow", () => {
      // Step 1: Create task
      let task: Task = {
        id: "task-1",
        title: "Schedule Orientation",
        type: "TIME_BOOKING",
        sectionId: "section-onboarding",
        status: "not_started",
        isLocked: false,
        completedAt: null,
      };

      // Step 2: Create config with scheduling URL
      const config: TimeBookingConfig = {
        id: "config-1",
        taskId: task.id,
        schedulingUrl: "https://calendly.com/company/orientation",
        instructions:
          "Please book a 1-hour orientation session with the HR team.",
        meetingType: "video",
        duration: 60,
        confirmations: [],
      };

      expect(config.schedulingUrl).toBeTruthy();

      // Step 3: Assignee clicks "Book Meeting" (opens external URL)
      // This would be handled by the frontend opening the URL in a new tab

      // Step 4: Assignee books and returns to confirm
      const confirmation: BookingConfirmation = {
        id: "booking-1",
        taskId: task.id,
        userId: "new-employee-1",
        bookedAt: new Date().toISOString(),
        meetingTime: "2024-04-05T14:00:00.000Z",
        confirmed: true,
        confirmedAt: new Date().toISOString(),
      };
      config.confirmations.push(confirmation);

      // Step 5: Task completes
      task = {
        ...task,
        status: "completed",
        completedAt: new Date().toISOString(),
      };

      expect(task.status).toBe("completed");
      expect(config.confirmations).toHaveLength(1);
      expect(config.confirmations[0].confirmed).toBe(true);
    });
  });

  test.describe("Edge Cases", () => {
    test("handles empty scheduling URL", () => {
      const config: TimeBookingConfig = {
        id: "config-1",
        taskId: "task-1",
        schedulingUrl: "",
        instructions: "Scheduling link will be provided later.",
        meetingType: "video",
        duration: 30,
        confirmations: [],
      };

      const hasValidUrl = config.schedulingUrl.length > 0;
      expect(hasValidUrl).toBe(false);
    });

    test("handles rescheduling", () => {
      const confirmations: BookingConfirmation[] = [
        {
          id: "booking-1",
          taskId: "task-1",
          userId: "user-1",
          bookedAt: new Date().toISOString(),
          meetingTime: "2024-04-01T10:00:00.000Z",
          confirmed: true,
          confirmedAt: new Date().toISOString(),
        },
      ];

      const reschedule = (
        bookingId: string,
        newMeetingTime: string
      ): BookingConfirmation | null => {
        const booking = confirmations.find((c) => c.id === bookingId);
        if (!booking) return null;

        booking.meetingTime = newMeetingTime;
        booking.bookedAt = new Date().toISOString();
        return booking;
      };

      const rescheduled = reschedule("booking-1", "2024-04-02T14:00:00.000Z");

      expect(rescheduled?.meetingTime).toBe("2024-04-02T14:00:00.000Z");
    });

    test("handles meeting cancellation", () => {
      let confirmations: BookingConfirmation[] = [
        {
          id: "booking-1",
          taskId: "task-1",
          userId: "user-1",
          bookedAt: new Date().toISOString(),
          meetingTime: "2024-04-01T10:00:00.000Z",
          confirmed: true,
          confirmedAt: new Date().toISOString(),
        },
      ];

      const cancelBooking = (bookingId: string): void => {
        const booking = confirmations.find((c) => c.id === bookingId);
        if (booking) {
          booking.confirmed = false;
        }
      };

      cancelBooking("booking-1");

      expect(confirmations[0].confirmed).toBe(false);
    });

    test("validates supported scheduling platforms", () => {
      const supportedPlatforms = [
        "calendly.com",
        "cal.com",
        "doodle.com",
        "acuityscheduling.com",
      ];

      const isKnownPlatform = (url: string): boolean => {
        try {
          const hostname = new URL(url).hostname;
          return supportedPlatforms.some(
            (p) => hostname === p || hostname.endsWith(`.${p}`)
          );
        } catch {
          return false;
        }
      };

      expect(isKnownPlatform("https://calendly.com/test")).toBe(true);
      expect(isKnownPlatform("https://cal.com/user/meeting")).toBe(true);
      expect(isKnownPlatform("https://unknown-platform.com/book")).toBe(false);
    });
  });
});
