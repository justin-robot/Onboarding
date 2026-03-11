import { database } from "@repo/database";
import type { AuditContext } from "./auditLog";
import { auditLogService } from "./auditLog";

export interface DuplicateWorkspaceOptions {
  name: string;
  description?: string;
  dueDate?: Date;
  adminUserId: string;
  assignToUsers?: string[];
}

export interface DuplicateWorkspaceResult {
  success: boolean;
  workspaceId?: string;
  error?: string;
}

/**
 * Template service for workspace duplication
 */
export const templateService = {
  /**
   * Duplicate an existing workspace as a template for a new client
   * Copies:
   * - Workspace settings
   * - Sections with positions
   * - Tasks with configs (form fields, etc.)
   * - Dependencies (remapped to new task IDs)
   * Optionally assigns to specific users
   */
  async duplicateWorkspace(
    sourceWorkspaceId: string,
    options: DuplicateWorkspaceOptions,
    auditContext?: AuditContext
  ): Promise<DuplicateWorkspaceResult> {
    // Get source workspace with all nested data
    const sourceWorkspace = await database
      .selectFrom("workspace")
      .selectAll()
      .where("id", "=", sourceWorkspaceId)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    if (!sourceWorkspace) {
      return { success: false, error: "Source workspace not found" };
    }

    // Get all sections
    const sections = await database
      .selectFrom("section")
      .selectAll()
      .where("workspaceId", "=", sourceWorkspaceId)
      .where("deletedAt", "is", null)
      .orderBy("position", "asc")
      .execute();

    // Get all tasks with their sections
    const tasks = sections.length > 0
      ? await database
          .selectFrom("task")
          .selectAll()
          .where(
            "sectionId",
            "in",
            sections.map((s) => s.id)
          )
          .where("deletedAt", "is", null)
          .orderBy("position", "asc")
          .execute()
      : [];

    // Get all dependencies
    const dependencies = tasks.length > 0
      ? await database
          .selectFrom("task_dependency")
          .selectAll()
          .where(
            "taskId",
            "in",
            tasks.map((t) => t.id)
          )
          .execute()
      : [];

    // Get all configs for each task type
    const taskIds = tasks.map((t) => t.id);

    const [formConfigs, acknowledgementConfigs, bookingConfigs, esignConfigs, fileRequestConfigs, approvalConfigs] =
      taskIds.length > 0
        ? await Promise.all([
            database.selectFrom("form_config").selectAll().where("taskId", "in", taskIds).execute(),
            database
              .selectFrom("acknowledgement_config")
              .selectAll()
              .where("taskId", "in", taskIds)
              .execute(),
            database.selectFrom("time_booking_config").selectAll().where("taskId", "in", taskIds).execute(),
            database.selectFrom("esign_config").selectAll().where("taskId", "in", taskIds).execute(),
            database
              .selectFrom("file_request_config")
              .selectAll()
              .where("taskId", "in", taskIds)
              .execute(),
            database.selectFrom("approval_config").selectAll().where("taskId", "in", taskIds).execute(),
          ])
        : [[], [], [], [], [], []];

    // Get form pages and elements for form configs
    const formConfigIds = formConfigs.map((fc) => fc.id);
    const formPages =
      formConfigIds.length > 0
        ? await database.selectFrom("form_page").selectAll().where("formConfigId", "in", formConfigIds).execute()
        : [];

    const formPageIds = formPages.map((fp) => fp.id);
    const formElements =
      formPageIds.length > 0
        ? await database.selectFrom("form_element").selectAll().where("formPageId", "in", formPageIds).execute()
        : [];

    // Create new workspace
    const newWorkspace = await database
      .insertInto("workspace")
      .values({
        name: options.name,
        description: options.description ?? sourceWorkspace.description,
        dueDate: options.dueDate ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Map old IDs to new IDs
    const sectionIdMap = new Map<string, string>();
    const taskIdMap = new Map<string, string>();
    const formConfigIdMap = new Map<string, string>();
    const formPageIdMap = new Map<string, string>();

    // Create sections
    for (const section of sections) {
      const newSection = await database
        .insertInto("section")
        .values({
          workspaceId: newWorkspace.id,
          title: section.title,
          position: section.position,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      sectionIdMap.set(section.id, newSection.id);
    }

    // Create tasks
    for (const task of tasks) {
      const newSectionId = sectionIdMap.get(task.sectionId);
      if (!newSectionId) continue;

      const newTask = await database
        .insertInto("task")
        .values({
          sectionId: newSectionId,
          title: task.title,
          description: task.description,
          type: task.type,
          status: "not_started",
          position: task.position,
          completionRule: task.completionRule,
          dueDateType: task.dueDateType,
          dueDateValue: task.dueDateValue,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      taskIdMap.set(task.id, newTask.id);
    }

    // Create configs for each task
    for (const config of formConfigs) {
      const newTaskId = taskIdMap.get(config.taskId);
      if (!newTaskId) continue;

      const newConfig = await database
        .insertInto("form_config")
        .values({
          taskId: newTaskId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      formConfigIdMap.set(config.id, newConfig.id);
    }

    // Create form pages
    for (const page of formPages) {
      const newConfigId = formConfigIdMap.get(page.formConfigId);
      if (!newConfigId) continue;

      const newPage = await database
        .insertInto("form_page")
        .values({
          formConfigId: newConfigId,
          title: page.title,
          position: page.position,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      formPageIdMap.set(page.id, newPage.id);
    }

    // Create form elements
    for (const element of formElements) {
      const newPageId = formPageIdMap.get(element.formPageId);
      if (!newPageId) continue;

      await database
        .insertInto("form_element")
        .values({
          formPageId: newPageId,
          type: element.type,
          label: element.label,
          placeholder: element.placeholder,
          helpText: element.helpText,
          required: element.required,
          validation: element.validation,
          options: element.options,
          position: element.position,
        })
        .execute();
    }

    // Create other configs
    for (const config of acknowledgementConfigs) {
      const newTaskId = taskIdMap.get(config.taskId);
      if (!newTaskId) continue;

      await database
        .insertInto("acknowledgement_config")
        .values({
          taskId: newTaskId,
          instructions: config.instructions,
        })
        .execute();
    }

    for (const config of bookingConfigs) {
      const newTaskId = taskIdMap.get(config.taskId);
      if (!newTaskId) continue;

      await database
        .insertInto("time_booking_config")
        .values({
          taskId: newTaskId,
          bookingLink: config.bookingLink,
        })
        .execute();
    }

    for (const config of esignConfigs) {
      const newTaskId = taskIdMap.get(config.taskId);
      if (!newTaskId) continue;

      // Note: We copy fileId and signerEmail - new documents might need to be uploaded
      await database
        .insertInto("esign_config")
        .values({
          taskId: newTaskId,
          fileId: config.fileId,
          signerEmail: config.signerEmail,
        })
        .execute();
    }

    for (const config of fileRequestConfigs) {
      const newTaskId = taskIdMap.get(config.taskId);
      if (!newTaskId) continue;

      await database
        .insertInto("file_request_config")
        .values({
          taskId: newTaskId,
          targetFolderId: config.targetFolderId,
        })
        .execute();
    }

    for (const config of approvalConfigs) {
      const newTaskId = taskIdMap.get(config.taskId);
      if (!newTaskId) continue;

      await database
        .insertInto("approval_config")
        .values({
          taskId: newTaskId,
        })
        .execute();
    }

    // Create dependencies with remapped IDs
    for (const dep of dependencies) {
      const newTaskId = taskIdMap.get(dep.taskId);
      const newDependsOnTaskId = taskIdMap.get(dep.dependsOnTaskId);
      if (!newTaskId || !newDependsOnTaskId) continue;

      await database
        .insertInto("task_dependency")
        .values({
          taskId: newTaskId,
          dependsOnTaskId: newDependsOnTaskId,
          type: dep.type,
          offsetDays: dep.offsetDays,
        })
        .execute();
    }

    // Add admin user to workspace
    await database
      .insertInto("workspace_member")
      .values({
        workspaceId: newWorkspace.id,
        userId: options.adminUserId,
        role: "admin",
      })
      .onConflict((oc) => oc.doNothing())
      .execute();

    // Assign additional users to workspace if specified
    if (options.assignToUsers && options.assignToUsers.length > 0) {
      // Add users as workspace members (skip admin if already in list)
      for (const userId of options.assignToUsers) {
        if (userId === options.adminUserId) continue; // Admin already added above

        await database
          .insertInto("workspace_member")
          .values({
            workspaceId: newWorkspace.id,
            userId,
            role: "user",
          })
          .onConflict((oc) => oc.doNothing())
          .execute();

        // Assign user to all tasks
        for (const [, newTaskId] of taskIdMap) {
          await database
            .insertInto("task_assignee")
            .values({
              taskId: newTaskId,
              userId,
            })
            .onConflict((oc) => oc.doNothing())
            .execute();
        }
      }
    }

    // Log audit event
    if (auditContext) {
      await auditLogService.logEvent({
        workspaceId: newWorkspace.id,
        eventType: "workspace.created",
        actorId: auditContext.actorId,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
        metadata: {
          duplicatedFrom: sourceWorkspaceId,
          sourceWorkspaceName: sourceWorkspace.name,
          sectionsCreated: sections.length,
          tasksCreated: tasks.length,
          usersAssigned: options.assignToUsers?.length ?? 0,
        },
      });
    }

    return {
      success: true,
      workspaceId: newWorkspace.id,
    };
  },
};
