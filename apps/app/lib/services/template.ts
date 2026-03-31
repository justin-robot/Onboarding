import { database } from "@repo/database";
import type { AuditContext } from "./auditLog";
import { auditLogService } from "./auditLog";
import { invitationService } from "./invitation";
import { pendingAssigneeService } from "./pendingAssignee";

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

export interface ListTemplatesOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  sectionCount: number;
  taskCount: number;
  createdAt: Date;
  updatedAt: Date;
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
    try {
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

    // Create new workspace in draft mode
    const newWorkspace = await database
      .insertInto("workspace")
      .values({
        name: options.name,
        description: options.description ?? sourceWorkspace.description,
        dueDate: options.dueDate ?? null,
        isPublished: false, // Start in draft mode
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
          validation: element.validation ? JSON.stringify(element.validation) : null,
          options: element.options ? JSON.stringify(element.options) : null,
          position: element.position,
        } as any)
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

    // Add manager user to workspace (the creator is always a direct member)
    await database
      .insertInto("workspace_member")
      .values({
        workspaceId: newWorkspace.id,
        userId: options.adminUserId,
        role: "manager",
      })
      .onConflict((oc) => oc.doNothing())
      .execute();

    // Create invitations and pending task assignments for users
    // Users will be invited (not directly assigned) and invitations sent when workspace is published
    if (options.assignToUsers && options.assignToUsers.length > 0) {
      for (const userId of options.assignToUsers) {
        if (userId === options.adminUserId) continue; // Admin already added above

        // Get user's email for invitation
        const user = await database
          .selectFrom("user")
          .select(["id", "email"])
          .where("id", "=", userId)
          .executeTakeFirst();

        if (!user || !user.email) continue;

        // Create invitation (email will be sent when workspace is published)
        const inviteResult = await invitationService.create({
          workspaceId: newWorkspace.id,
          email: user.email,
          role: "member",
          invitedBy: options.adminUserId,
        });

        if (inviteResult.success) {
          // Create pending task assignments for ALL tasks
          for (const [, newTaskId] of taskIdMap) {
            await pendingAssigneeService.create(
              newTaskId,
              user.email,
              options.adminUserId
            );
          }
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
          usersInvited: options.assignToUsers?.length ?? 0,
          startedInDraftMode: true,
        },
      });
    }

    return {
      success: true,
      workspaceId: newWorkspace.id,
    };
    } catch (error) {
      console.error("Error duplicating workspace:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to duplicate workspace",
      };
    }
  },

  /**
   * List all workspace templates
   */
  async listTemplates(options?: ListTemplatesOptions): Promise<{ data: Template[]; total: number }> {
    const limit = options?.limit ?? 25;
    const offset = options?.offset ?? 0;

    let query = database
      .selectFrom("workspace")
      .select([
        "workspace.id",
        "workspace.name",
        "workspace.description",
        "workspace.createdAt",
        "workspace.updatedAt",
      ])
      .select((eb) => [
        eb
          .selectFrom("section")
          .select((eb2) => eb2.fn.count("id").as("count"))
          .whereRef("section.workspaceId", "=", "workspace.id")
          .where("section.deletedAt", "is", null)
          .as("sectionCount"),
        eb
          .selectFrom("task")
          .innerJoin("section", "section.id", "task.sectionId")
          .select((eb2) => eb2.fn.count("task.id").as("count"))
          .whereRef("section.workspaceId", "=", "workspace.id")
          .where("task.deletedAt", "is", null)
          .as("taskCount"),
      ])
      .where("workspace.isTemplate", "=", true)
      .where("workspace.deletedAt", "is", null);

    // Apply search filter
    if (options?.search) {
      query = query.where((eb) =>
        eb.or([
          eb("workspace.name", "ilike", `%${options.search}%`),
          eb("workspace.description", "ilike", `%${options.search}%`),
        ])
      );
    }

    // Get total count
    let countQuery = database
      .selectFrom("workspace")
      .select((eb) => eb.fn.count("id").as("total"))
      .where("isTemplate", "=", true)
      .where("deletedAt", "is", null);

    if (options?.search) {
      countQuery = countQuery.where((eb) =>
        eb.or([
          eb("name", "ilike", `%${options.search}%`),
          eb("description", "ilike", `%${options.search}%`),
        ])
      );
    }

    const totalResult = await countQuery.executeTakeFirst();
    const total = Number(totalResult?.total || 0);

    // Apply pagination and sorting
    query = query.orderBy("workspace.createdAt", "desc").limit(limit).offset(offset);

    const templates = await query.execute();

    return {
      data: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        sectionCount: Number(t.sectionCount || 0),
        taskCount: Number(t.taskCount || 0),
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      total,
    };
  },

  /**
   * Get a single template by ID
   */
  async getTemplate(templateId: string): Promise<Template | null> {
    const template = await database
      .selectFrom("workspace")
      .select([
        "workspace.id",
        "workspace.name",
        "workspace.description",
        "workspace.createdAt",
        "workspace.updatedAt",
      ])
      .select((eb) => [
        eb
          .selectFrom("section")
          .select((eb2) => eb2.fn.count("id").as("count"))
          .whereRef("section.workspaceId", "=", "workspace.id")
          .where("section.deletedAt", "is", null)
          .as("sectionCount"),
        eb
          .selectFrom("task")
          .innerJoin("section", "section.id", "task.sectionId")
          .select((eb2) => eb2.fn.count("task.id").as("count"))
          .whereRef("section.workspaceId", "=", "workspace.id")
          .where("task.deletedAt", "is", null)
          .as("taskCount"),
      ])
      .where("workspace.id", "=", templateId)
      .where("workspace.isTemplate", "=", true)
      .where("workspace.deletedAt", "is", null)
      .executeTakeFirst();

    if (!template) return null;

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      sectionCount: Number(template.sectionCount || 0),
      taskCount: Number(template.taskCount || 0),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  },

  /**
   * Mark a workspace as a template
   */
  async markAsTemplate(
    workspaceId: string,
    auditContext?: AuditContext
  ): Promise<{ success: boolean; error?: string }> {
    const workspace = await database
      .selectFrom("workspace")
      .select(["id", "name", "isTemplate"])
      .where("id", "=", workspaceId)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    if (!workspace) {
      return { success: false, error: "Workspace not found" };
    }

    if (workspace.isTemplate) {
      return { success: false, error: "Workspace is already a template" };
    }

    await database
      .updateTable("workspace")
      .set({ isTemplate: true, updatedAt: new Date() })
      .where("id", "=", workspaceId)
      .execute();

    if (auditContext) {
      await auditLogService.logEvent({
        workspaceId,
        eventType: "workspace.marked_as_template",
        actorId: auditContext.actorId,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
        metadata: { workspaceName: workspace.name },
      });
    }

    return { success: true };
  },

  /**
   * Unmark a template (convert back to regular workspace)
   */
  async unmarkAsTemplate(
    workspaceId: string,
    auditContext?: AuditContext
  ): Promise<{ success: boolean; error?: string }> {
    const workspace = await database
      .selectFrom("workspace")
      .select(["id", "name", "isTemplate"])
      .where("id", "=", workspaceId)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    if (!workspace) {
      return { success: false, error: "Workspace not found" };
    }

    if (!workspace.isTemplate) {
      return { success: false, error: "Workspace is not a template" };
    }

    await database
      .updateTable("workspace")
      .set({ isTemplate: false, updatedAt: new Date() })
      .where("id", "=", workspaceId)
      .execute();

    if (auditContext) {
      await auditLogService.logEvent({
        workspaceId,
        eventType: "workspace.unmarked_as_template",
        actorId: auditContext.actorId,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
        metadata: { workspaceName: workspace.name },
      });
    }

    return { success: true };
  },

  /**
   * Create a new workspace from a template
   * This is a wrapper around duplicateWorkspace that verifies the source is a template
   */
  async createFromTemplate(
    templateId: string,
    options: DuplicateWorkspaceOptions,
    auditContext?: AuditContext
  ): Promise<DuplicateWorkspaceResult> {
    // Verify the source is actually a template
    const template = await database
      .selectFrom("workspace")
      .select(["id", "isTemplate"])
      .where("id", "=", templateId)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    if (!template.isTemplate) {
      return { success: false, error: "Source workspace is not a template" };
    }

    // Use the existing duplicateWorkspace method
    return this.duplicateWorkspace(templateId, options, auditContext);
  },

  /**
   * Delete a template (soft delete)
   */
  async deleteTemplate(
    templateId: string,
    auditContext?: AuditContext
  ): Promise<{ success: boolean; error?: string }> {
    const template = await database
      .selectFrom("workspace")
      .select(["id", "name", "isTemplate"])
      .where("id", "=", templateId)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    if (!template.isTemplate) {
      return { success: false, error: "Workspace is not a template" };
    }

    await database
      .updateTable("workspace")
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where("id", "=", templateId)
      .execute();

    if (auditContext) {
      await auditLogService.logEvent({
        workspaceId: templateId,
        eventType: "workspace.deleted",
        actorId: auditContext.actorId,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
        metadata: { workspaceName: template.name, isTemplate: true },
      });
    }

    return { success: true };
  },
};
