import { database } from "@repo/database";
import { taskService, type TaskWithLockStatus } from "./task";
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

import type {
  Section,
  NewSection,
  SectionUpdate,
  Task,
} from "@repo/database";

// Types for nested section structure
export interface SectionWithTasks extends Section {
  tasks: Task[];
}

export interface SectionWithTasksAndLockStatus extends Section {
  tasks: TaskWithLockStatus[];
}

export interface SectionProgress {
  total: number;
  completed: number;
  percentage: number;
}

// Section status type (derived, never stored)
export type SectionStatus = "not_started" | "in_progress" | "completed";

// Section with computed status and progress counts
export interface SectionWithStatus extends Section {
  status: SectionStatus;
  completedCount: number;
  totalCount: number;
}

export const sectionService = {
  /**
   * Create a new section
   */
  async create(input: NewSection, auditContext?: AuditContext): Promise<Section> {
    const section = await database
      .insertInto("section")
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();

    if (auditContext) {
      await auditLogService.logEvent({
        workspaceId: section.workspaceId,
        eventType: "section.created",
        actorId: auditContext.actorId,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
        metadata: { sectionTitle: section.title },
      });
    }

    // Broadcast section created event (fire and forget)
    getAblyService().then((ably) => {
      if (ably) {
        ably.ablyService.broadcastToWorkspace(
          section.workspaceId,
          ably.WORKSPACE_EVENTS.SECTION_CREATED,
          {
            sectionId: section.id,
            title: section.title,
            position: section.position,
          }
        ).catch((err: unknown) => console.error("Failed to broadcast section created:", err));
      }
    });

    return section;
  },

  /**
   * Get a section by ID (excludes soft-deleted)
   */
  async getById(id: string): Promise<Section | null> {
    const section = await database
      .selectFrom("section")
      .selectAll()
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    return section ?? null;
  },

  /**
   * Get all sections for a workspace, ordered by position
   */
  async getByWorkspaceId(workspaceId: string): Promise<Section[]> {
    return database
      .selectFrom("section")
      .selectAll()
      .where("workspaceId", "=", workspaceId)
      .where("deletedAt", "is", null)
      .orderBy("position", "asc")
      .execute();
  },

  /**
   * Get a section with nested tasks
   */
  async getByIdWithTasks(id: string): Promise<SectionWithTasks | null> {
    const section = await this.getById(id);
    if (!section) {
      return null;
    }

    const tasks = await database
      .selectFrom("task")
      .selectAll()
      .where("sectionId", "=", id)
      .where("deletedAt", "is", null)
      .orderBy("position", "asc")
      .execute();

    return {
      ...section,
      tasks,
    };
  },

  /**
   * Get a section with nested tasks including lock status
   */
  async getByIdWithTasksAndLockStatus(id: string): Promise<SectionWithTasksAndLockStatus | null> {
    const section = await this.getById(id);
    if (!section) {
      return null;
    }

    const tasks = await taskService.getBySectionIdWithLockStatus(id);

    return {
      ...section,
      tasks,
    };
  },

  /**
   * Update a section (excludes soft-deleted)
   */
  async update(
    id: string,
    input: Omit<SectionUpdate, "id" | "workspaceId" | "createdAt" | "deletedAt">,
    auditContext?: AuditContext
  ): Promise<Section | null> {
    // Get current state for change tracking
    const current = auditContext ? await this.getById(id) : null;

    const result = await database
      .updateTable("section")
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();

    if (result && auditContext && current) {
      // Build changes metadata
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined && current[key as keyof typeof current] !== value) {
          changes[key] = { from: current[key as keyof typeof current], to: value };
        }
      }

      if (Object.keys(changes).length > 0) {
        await auditLogService.logEvent({
          workspaceId: result.workspaceId,
          eventType: "section.updated",
          actorId: auditContext.actorId,
          source: auditContext.source,
          ipAddress: auditContext.ipAddress,
          metadata: { changes },
        });
      }
    }

    // Broadcast section updated event (fire and forget)
    if (result) {
      getAblyService().then((ably) => {
        if (ably) {
          ably.ablyService.broadcastToWorkspace(
            result.workspaceId,
            ably.WORKSPACE_EVENTS.SECTION_UPDATED,
            {
              sectionId: result.id,
              title: result.title,
              position: result.position,
              changes: input,
            }
          ).catch((err: unknown) => console.error("Failed to broadcast section updated:", err));
        }
      });
    }

    return result ?? null;
  },

  /**
   * Soft delete a section
   */
  async softDelete(id: string, auditContext?: AuditContext): Promise<boolean> {
    // Get section for workspaceId before deleting (needed for audit and broadcast)
    const section = await this.getById(id);

    const result = await database
      .updateTable("section")
      .set({ deletedAt: new Date() })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    const deleted = (result.numUpdatedRows ?? 0n) > 0n;

    if (deleted && auditContext && section) {
      await auditLogService.logEvent({
        workspaceId: section.workspaceId,
        eventType: "section.deleted",
        actorId: auditContext.actorId,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
      });
    }

    // Broadcast section deleted event (fire and forget)
    if (deleted && section) {
      getAblyService().then((ably) => {
        if (ably) {
          ably.ablyService.broadcastToWorkspace(
            section.workspaceId,
            ably.WORKSPACE_EVENTS.SECTION_DELETED,
            { sectionId: id }
          ).catch((err: unknown) => console.error("Failed to broadcast section deleted:", err));
        }
      });
    }

    return deleted;
  },

  /**
   * Reorder sections by array of IDs
   * Updates positions sequentially (Neon serverless doesn't support transactions)
   */
  async reorder(workspaceId: string, sectionIds: string[]): Promise<void> {
    for (let i = 0; i < sectionIds.length; i++) {
      await database
        .updateTable("section")
        .set({ position: i, updatedAt: new Date() })
        .where("id", "=", sectionIds[i])
        .where("workspaceId", "=", workspaceId)
        .where("deletedAt", "is", null)
        .execute();
    }
  },

  /**
   * Get progress for a section (computed from task completion)
   */
  async getProgress(sectionId: string): Promise<SectionProgress> {
    const tasks = await database
      .selectFrom("task")
      .select(["status"])
      .where("sectionId", "=", sectionId)
      .where("deletedAt", "is", null)
      .execute();

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const percentage = total === 0 ? 0 : (completed / total) * 100;

    return {
      total,
      completed,
      percentage: Math.round(percentage * 100) / 100,
    };
  },

  /**
   * Compute section status from task statuses (never stored)
   * - All completed → "completed"
   * - Any in_progress OR some completed but not all → "in_progress"
   * - Else → "not_started"
   */
  async getStatus(sectionId: string): Promise<SectionStatus> {
    const tasks = await database
      .selectFrom("task")
      .select(["status"])
      .where("sectionId", "=", sectionId)
      .where("deletedAt", "is", null)
      .execute();

    if (tasks.length === 0) {
      return "not_started";
    }

    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;

    if (completedCount === tasks.length) {
      return "completed";
    }

    if (inProgressCount > 0 || completedCount > 0) {
      return "in_progress";
    }

    return "not_started";
  },

  /**
   * Get section with computed status and progress counts
   */
  async getByIdWithStatus(sectionId: string): Promise<SectionWithStatus | null> {
    const section = await this.getById(sectionId);
    if (!section) {
      return null;
    }

    const tasks = await database
      .selectFrom("task")
      .select(["status"])
      .where("sectionId", "=", sectionId)
      .where("deletedAt", "is", null)
      .execute();

    const totalCount = tasks.length;
    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;

    let status: SectionStatus;
    if (totalCount === 0) {
      status = "not_started";
    } else if (completedCount === totalCount) {
      status = "completed";
    } else if (inProgressCount > 0 || completedCount > 0) {
      status = "in_progress";
    } else {
      status = "not_started";
    }

    return {
      ...section,
      status,
      completedCount,
      totalCount,
    };
  },

  /**
   * Broadcast section status change
   * Call this after task status changes that might affect section status
   */
  async broadcastStatusChange(sectionId: string): Promise<void> {
    const sectionWithStatus = await this.getByIdWithStatus(sectionId);
    if (!sectionWithStatus) return;

    const ably = await getAblyService();
    if (ably) {
      ably.ablyService.broadcastToWorkspace(
        sectionWithStatus.workspaceId,
        ably.WORKSPACE_EVENTS.SECTION_STATUS_CHANGED,
        {
          sectionId: sectionWithStatus.id,
          status: sectionWithStatus.status,
          completedCount: sectionWithStatus.completedCount,
          totalCount: sectionWithStatus.totalCount,
        }
      ).catch((err: unknown) => console.error("Failed to broadcast section status:", err));
    }
  },
};
