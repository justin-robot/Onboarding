import { database } from "@repo/database";
import { dependencyService } from "./dependency";
import { configService } from "./config";
import { auditLogService, type AuditContext } from "./auditLog";

// Dynamically import ably to avoid bundling issues with Next.js
// Uses string variable to prevent static analysis by bundler
const ABLY_PATH = "./ably";
async function getAblyService() {
  if (typeof window !== "undefined") return null; // Client-side guard
  try {
    const module = await import(/* webpackIgnore: true */ ABLY_PATH);
    return { ablyService: module.ablyService, WORKSPACE_EVENTS: module.WORKSPACE_EVENTS };
  } catch {
    return null;
  }
}

// Helper to broadcast section status change (avoids circular dependency)
async function broadcastSectionStatusChange(sectionId: string): Promise<void> {
  const { sectionService } = await import("./section");
  await sectionService.broadcastStatusChange(sectionId);
}
import type {
  Task,
  NewTask,
  TaskUpdate,
  FormConfig,
  AcknowledgementConfig,
  TimeBookingConfig,
  ESignConfig,
  FileRequestConfig,
  ApprovalConfig,
} from "@repo/database";

// Helper to get workspaceId from task via section
async function getWorkspaceIdForTask(taskId: string): Promise<string | null> {
  const result = await database
    .selectFrom("task")
    .innerJoin("section", "section.id", "task.sectionId")
    .select("section.workspaceId")
    .where("task.id", "=", taskId)
    .executeTakeFirst();
  return result?.workspaceId ?? null;
}

// Task with computed lock status
export interface TaskWithLockStatus extends Task {
  locked: boolean;
}

// Config union type
export type TaskConfig =
  | FormConfig
  | AcknowledgementConfig
  | TimeBookingConfig
  | ESignConfig
  | FileRequestConfig
  | ApprovalConfig;

// Task with config
export interface TaskWithConfig extends Task {
  config: TaskConfig | null;
}

// Task with both config and lock status
export interface TaskFull extends Task {
  locked: boolean;
  config: TaskConfig | null;
}

export const taskService = {
  /**
   * Create a new task
   */
  async create(input: NewTask, auditContext?: AuditContext): Promise<Task> {
    const task = await database
      .insertInto("task")
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();

    // Get workspaceId for audit and broadcast
    const workspaceId = await getWorkspaceIdForTask(task.id);

    if (auditContext && workspaceId) {
      await auditLogService.logEvent({
        workspaceId,
        eventType: "task.created",
        actorId: auditContext.actorId,
        taskId: task.id,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
        metadata: { taskTitle: task.title, taskType: task.type },
      });
    }

    // Broadcast task created event (fire and forget)
    if (workspaceId) {
      getAblyService().then((ably) => {
        if (ably) {
          ably.ablyService.broadcastToWorkspace(workspaceId, ably.WORKSPACE_EVENTS.TASK_CREATED, {
            taskId: task.id,
            sectionId: task.sectionId,
            title: task.title,
            type: task.type,
            status: task.status,
            position: task.position,
          }).catch((err: unknown) => console.error("Failed to broadcast task created:", err));
        }
      });

      // Broadcast section status change (new task affects section status)
      broadcastSectionStatusChange(task.sectionId).catch((err: unknown) =>
        console.error("Failed to broadcast section status:", err)
      );
    }

    return task;
  },

  /**
   * Get a task by ID (excludes soft-deleted)
   */
  async getById(id: string): Promise<Task | null> {
    const task = await database
      .selectFrom("task")
      .selectAll()
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    return task ?? null;
  },

  /**
   * Get all tasks for a section, ordered by position
   */
  async getBySectionId(sectionId: string): Promise<Task[]> {
    return database
      .selectFrom("task")
      .selectAll()
      .where("sectionId", "=", sectionId)
      .where("deletedAt", "is", null)
      .orderBy("position", "asc")
      .execute();
  },

  /**
   * Update a task (excludes soft-deleted)
   */
  async update(
    id: string,
    input: Omit<TaskUpdate, "id" | "sectionId" | "createdAt" | "deletedAt">,
    auditContext?: AuditContext
  ): Promise<Task | null> {
    // Get current state for change tracking
    const current = auditContext ? await this.getById(id) : null;

    const result = await database
      .updateTable("task")
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();

    if (result) {
      const workspaceId = await getWorkspaceIdForTask(id);

      // Audit logging with change tracking
      if (auditContext && current && workspaceId) {
        const changes: Record<string, { from: unknown; to: unknown }> = {};
        for (const [key, value] of Object.entries(input)) {
          if (value !== undefined && current[key as keyof typeof current] !== value) {
            changes[key] = { from: current[key as keyof typeof current], to: value };
          }
        }

        if (Object.keys(changes).length > 0) {
          await auditLogService.logEvent({
            workspaceId,
            eventType: "task.updated",
            actorId: auditContext.actorId,
            taskId: id,
            source: auditContext.source,
            ipAddress: auditContext.ipAddress,
            metadata: { changes },
          });
        }
      }

      // Broadcast task updated event (fire and forget)
      if (workspaceId) {
        getAblyService().then((ably) => {
          if (ably) {
            ably.ablyService.broadcastToWorkspace(workspaceId, ably.WORKSPACE_EVENTS.TASK_UPDATED, {
              taskId: result.id,
              sectionId: result.sectionId,
              title: result.title,
              status: result.status,
              changes: input,
            }).catch((err: unknown) => console.error("Failed to broadcast task updated:", err));
          }
        });

        // Broadcast section status change if task status changed
        if (input.status !== undefined) {
          broadcastSectionStatusChange(result.sectionId).catch((err) =>
            console.error("Failed to broadcast section status:", err)
          );
        }
      }
    }

    return result ?? null;
  },

  /**
   * Soft delete a task
   */
  async softDelete(id: string, auditContext?: AuditContext): Promise<boolean> {
    // Get task info and workspaceId before deleting
    const task = await this.getById(id);
    const workspaceId = await getWorkspaceIdForTask(id);

    const result = await database
      .updateTable("task")
      .set({ deletedAt: new Date() })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    const deleted = (result.numUpdatedRows ?? 0n) > 0n;

    if (deleted) {
      // Audit logging
      if (auditContext && workspaceId) {
        await auditLogService.logEvent({
          workspaceId,
          eventType: "task.deleted",
          actorId: auditContext.actorId,
          taskId: id,
          source: auditContext.source,
          ipAddress: auditContext.ipAddress,
        });
      }

      // Broadcast task deleted event (fire and forget)
      if (workspaceId && task) {
        getAblyService().then((ably) => {
          if (ably) {
            ably.ablyService.broadcastToWorkspace(workspaceId, ably.WORKSPACE_EVENTS.TASK_DELETED, {
              taskId: id,
              sectionId: task.sectionId,
            }).catch((err: unknown) => console.error("Failed to broadcast task deleted:", err));
          }
        });

        // Broadcast section status change (deleted task affects section status)
        broadcastSectionStatusChange(task.sectionId).catch((err) =>
          console.error("Failed to broadcast section status:", err)
        );
      }
    }

    return deleted;
  },

  /**
   * Reorder tasks within a section by array of IDs
   */
  async reorder(sectionId: string, taskIds: string[]): Promise<void> {
    for (let i = 0; i < taskIds.length; i++) {
      await database
        .updateTable("task")
        .set({ position: i, updatedAt: new Date() })
        .where("id", "=", taskIds[i])
        .where("sectionId", "=", sectionId)
        .where("deletedAt", "is", null)
        .execute();
    }
  },

  /**
   * Move a task to a different section at a specific position
   * Updates positions in both source and target sections
   */
  async moveToSection(
    taskId: string,
    targetSectionId: string,
    targetPosition: number
  ): Promise<Task | null> {
    // Get the task to find source section
    const task = await this.getById(taskId);
    if (!task) {
      return null;
    }

    const sourceSectionId = task.sectionId;

    // Shift down tasks in target section at and after target position
    await database
      .updateTable("task")
      .set((eb) => ({
        position: eb("position", "+", 1),
        updatedAt: new Date(),
      }))
      .where("sectionId", "=", targetSectionId)
      .where("position", ">=", targetPosition)
      .where("deletedAt", "is", null)
      .execute();

    // Move the task to target section at target position
    const movedTask = await database
      .updateTable("task")
      .set({
        sectionId: targetSectionId,
        position: targetPosition,
        updatedAt: new Date(),
      })
      .where("id", "=", taskId)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();

    // Recompact positions in source section (close the gap)
    const sourceTasks = await database
      .selectFrom("task")
      .select(["id"])
      .where("sectionId", "=", sourceSectionId)
      .where("deletedAt", "is", null)
      .orderBy("position", "asc")
      .execute();

    for (let i = 0; i < sourceTasks.length; i++) {
      await database
        .updateTable("task")
        .set({ position: i, updatedAt: new Date() })
        .where("id", "=", sourceTasks[i].id)
        .execute();
    }

    return movedTask ?? null;
  },

  /**
   * Mark a task as completed
   */
  async markComplete(id: string, auditContext?: AuditContext): Promise<Task | null> {
    const result = await database
      .updateTable("task")
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();

    if (result) {
      const workspaceId = await getWorkspaceIdForTask(id);

      // Audit logging
      if (auditContext && workspaceId) {
        await auditLogService.logEvent({
          workspaceId,
          eventType: "task.completed",
          actorId: auditContext.actorId,
          taskId: id,
          source: auditContext.source,
          ipAddress: auditContext.ipAddress,
        });
      }

      // Broadcast task completed event (fire and forget)
      if (workspaceId) {
        getAblyService().then((ably) => {
          if (ably) {
            ably.ablyService.broadcastToWorkspace(workspaceId, ably.WORKSPACE_EVENTS.TASK_COMPLETED, {
              taskId: result.id,
              sectionId: result.sectionId,
              title: result.title,
              completedAt: result.completedAt,
            }).catch((err: unknown) => console.error("Failed to broadcast task completed:", err));
          }
        });

        // Broadcast section status change (task completion affects section status)
        broadcastSectionStatusChange(result.sectionId).catch((err) =>
          console.error("Failed to broadcast section status:", err)
        );
      }
    }

    return result ?? null;
  },

  /**
   * Mark a task as incomplete (revert to not_started)
   */
  async markIncomplete(id: string, auditContext?: AuditContext): Promise<Task | null> {
    const result = await database
      .updateTable("task")
      .set({
        status: "not_started",
        completedAt: null,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();

    if (result && auditContext) {
      const workspaceId = await getWorkspaceIdForTask(id);
      if (workspaceId) {
        await auditLogService.logEvent({
          workspaceId,
          eventType: "task.reopened",
          actorId: auditContext.actorId,
          taskId: id,
          source: auditContext.source,
          ipAddress: auditContext.ipAddress,
        });
      }
    }

    return result ?? null;
  },

  /**
   * Get a task by ID with computed lock status
   */
  async getByIdWithLockStatus(id: string): Promise<TaskWithLockStatus | null> {
    const task = await this.getById(id);
    if (!task) {
      return null;
    }

    const unlocked = await dependencyService.isTaskUnlocked(id);
    return {
      ...task,
      locked: !unlocked,
    };
  },

  /**
   * Get all tasks for a section with computed lock status
   */
  async getBySectionIdWithLockStatus(sectionId: string): Promise<TaskWithLockStatus[]> {
    const tasks = await this.getBySectionId(sectionId);

    const tasksWithLockStatus: TaskWithLockStatus[] = [];
    for (const task of tasks) {
      const unlocked = await dependencyService.isTaskUnlocked(task.id);
      tasksWithLockStatus.push({
        ...task,
        locked: !unlocked,
      });
    }

    return tasksWithLockStatus;
  },

  /**
   * Get a task by ID with its type-specific config loaded
   */
  async getByIdWithConfig(id: string): Promise<TaskWithConfig | null> {
    const task = await this.getById(id);
    if (!task) {
      return null;
    }

    const config = await configService.getConfigByTaskId(id, task.type);

    return {
      ...task,
      config,
    };
  },

  /**
   * Get a task by ID with both config and lock status
   */
  async getByIdFull(id: string): Promise<TaskFull | null> {
    const task = await this.getById(id);
    if (!task) {
      return null;
    }

    const [config, unlocked] = await Promise.all([
      configService.getConfigByTaskId(id, task.type),
      dependencyService.isTaskUnlocked(id),
    ]);

    return {
      ...task,
      config,
      locked: !unlocked,
    };
  },
};
