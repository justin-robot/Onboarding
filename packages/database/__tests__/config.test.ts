import { describe, it, expect, afterAll } from "vitest";
import { database } from "../index";
import { configService } from "../services/config";
import { taskService } from "../services/task";
import { sectionService } from "../services/section";
import { workspaceService } from "../services/workspace";

describe("ConfigService", () => {
  // Track created IDs for cleanup
  const createdWorkspaceIds: string[] = [];
  const createdSectionIds: string[] = [];
  const createdTaskIds: string[] = [];
  const createdConfigIds: { table: string; id: string }[] = [];

  afterAll(async () => {
    // Cleanup configs
    for (const { table, id } of createdConfigIds) {
      await database.deleteFrom(table as any).where("id", "=", id).execute();
    }
    // Cleanup in reverse order
    for (const id of createdTaskIds) {
      await database.deleteFrom("task").where("id", "=", id).execute();
    }
    for (const id of createdSectionIds) {
      await database.deleteFrom("section").where("id", "=", id).execute();
    }
    for (const id of createdWorkspaceIds) {
      await database.deleteFrom("workspace").where("id", "=", id).execute();
    }
  });

  // Helper to create workspace and section
  async function createTestSection() {
    const workspace = await workspaceService.create({ name: `Config Test ${Date.now()}` });
    createdWorkspaceIds.push(workspace.id);

    const section = await sectionService.create({
      workspaceId: workspace.id,
      title: "Test Section",
      position: 0,
    });
    createdSectionIds.push(section.id);

    return section;
  }

  describe("FormConfig", () => {
    it("should create form config for a task", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "Form Task",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task.id);

      const config = await configService.createFormConfig(task.id);
      createdConfigIds.push({ table: "form_config", id: config.id });

      expect(config.id).toBeDefined();
      expect(config.taskId).toBe(task.id);
    });

    it("should get form config by task ID", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "Form Task",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task.id);

      const created = await configService.createFormConfig(task.id);
      createdConfigIds.push({ table: "form_config", id: created.id });

      const config = await configService.getFormConfigByTaskId(task.id);

      expect(config).toBeDefined();
      expect(config!.id).toBe(created.id);
    });

    it("should return null for non-existent form config", async () => {
      const config = await configService.getFormConfigByTaskId("non-existent");
      expect(config).toBeNull();
    });
  });

  describe("AcknowledgementConfig", () => {
    it("should create acknowledgement config with instructions", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "Acknowledgement Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task.id);

      const config = await configService.createAcknowledgementConfig(task.id, {
        instructions: "Please read and acknowledge",
      });
      createdConfigIds.push({ table: "acknowledgement_config", id: config.id });

      expect(config.taskId).toBe(task.id);
      expect(config.instructions).toBe("Please read and acknowledge");
    });

    it("should get acknowledgement config by task ID", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "Acknowledgement Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task.id);

      const created = await configService.createAcknowledgementConfig(task.id);
      createdConfigIds.push({ table: "acknowledgement_config", id: created.id });

      const config = await configService.getAcknowledgementConfigByTaskId(task.id);

      expect(config).toBeDefined();
      expect(config!.id).toBe(created.id);
    });

    it("should update acknowledgement config instructions", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "Acknowledgement Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task.id);

      const created = await configService.createAcknowledgementConfig(task.id, {
        instructions: "Original",
      });
      createdConfigIds.push({ table: "acknowledgement_config", id: created.id });

      const updated = await configService.updateAcknowledgementConfig(created.id, {
        instructions: "Updated instructions",
      });

      expect(updated!.instructions).toBe("Updated instructions");
    });
  });

  describe("TimeBookingConfig", () => {
    it("should create time booking config with booking link", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "Time Booking Task",
        position: 0,
        type: "TIME_BOOKING",
      });
      createdTaskIds.push(task.id);

      const config = await configService.createTimeBookingConfig(task.id, {
        bookingLink: "https://calendly.com/example",
      });
      createdConfigIds.push({ table: "time_booking_config", id: config.id });

      expect(config.taskId).toBe(task.id);
      expect(config.bookingLink).toBe("https://calendly.com/example");
    });

    it("should get time booking config by task ID", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "Time Booking Task",
        position: 0,
        type: "TIME_BOOKING",
      });
      createdTaskIds.push(task.id);

      const created = await configService.createTimeBookingConfig(task.id, {
        bookingLink: "https://calendly.com/test",
      });
      createdConfigIds.push({ table: "time_booking_config", id: created.id });

      const config = await configService.getTimeBookingConfigByTaskId(task.id);

      expect(config).toBeDefined();
      expect(config!.bookingLink).toBe("https://calendly.com/test");
    });
  });

  describe("ESignConfig", () => {
    it("should create e-sign config", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "E-Sign Task",
        position: 0,
        type: "E_SIGN",
      });
      createdTaskIds.push(task.id);

      const config = await configService.createESignConfig(task.id, {
        fileId: "test-file-id",
        signerEmail: "signer@example.com",
      });
      createdConfigIds.push({ table: "esign_config", id: config.id });

      expect(config.taskId).toBe(task.id);
      expect(config.fileId).toBe("test-file-id");
      expect(config.signerEmail).toBe("signer@example.com");
      expect(config.status).toBe("pending");
      expect(config.providerDocumentId).toBeNull();
      expect(config.providerSigningUrl).toBeNull();
    });

    it("should get e-sign config by task ID", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "E-Sign Task",
        position: 0,
        type: "E_SIGN",
      });
      createdTaskIds.push(task.id);

      const created = await configService.createESignConfig(task.id, {
        fileId: "test-file-id-2",
        signerEmail: "signer2@example.com",
      });
      createdConfigIds.push({ table: "esign_config", id: created.id });

      const config = await configService.getESignConfigByTaskId(task.id);

      expect(config).toBeDefined();
      expect(config!.fileId).toBe("test-file-id-2");
      expect(config!.signerEmail).toBe("signer2@example.com");
    });
  });

  describe("FileRequestConfig", () => {
    it("should create file request config", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "File Request Task",
        position: 0,
        type: "FILE_REQUEST",
      });
      createdTaskIds.push(task.id);

      const config = await configService.createFileRequestConfig(task.id, {
        targetFolderId: "folder-123",
      });
      createdConfigIds.push({ table: "file_request_config", id: config.id });

      expect(config.taskId).toBe(task.id);
      expect(config.targetFolderId).toBe("folder-123");
    });

    it("should create file request config without target folder", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "File Request Task",
        position: 0,
        type: "FILE_REQUEST",
      });
      createdTaskIds.push(task.id);

      const config = await configService.createFileRequestConfig(task.id);
      createdConfigIds.push({ table: "file_request_config", id: config.id });

      expect(config.taskId).toBe(task.id);
      expect(config.targetFolderId).toBeNull();
    });

    it("should get file request config by task ID", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "File Request Task",
        position: 0,
        type: "FILE_REQUEST",
      });
      createdTaskIds.push(task.id);

      const created = await configService.createFileRequestConfig(task.id);
      createdConfigIds.push({ table: "file_request_config", id: created.id });

      const config = await configService.getFileRequestConfigByTaskId(task.id);

      expect(config).toBeDefined();
      expect(config!.id).toBe(created.id);
    });
  });

  describe("ApprovalConfig", () => {
    it("should create approval config", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "Approval Task",
        position: 0,
        type: "APPROVAL",
      });
      createdTaskIds.push(task.id);

      const config = await configService.createApprovalConfig(task.id);
      createdConfigIds.push({ table: "approval_config", id: config.id });

      expect(config.id).toBeDefined();
      expect(config.taskId).toBe(task.id);
    });

    it("should get approval config by task ID", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "Approval Task",
        position: 0,
        type: "APPROVAL",
      });
      createdTaskIds.push(task.id);

      const created = await configService.createApprovalConfig(task.id);
      createdConfigIds.push({ table: "approval_config", id: created.id });

      const config = await configService.getApprovalConfigByTaskId(task.id);

      expect(config).toBeDefined();
      expect(config!.id).toBe(created.id);
    });
  });

  describe("createConfigForTask", () => {
    it("should auto-create form config for FORM task", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "Auto Form",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task.id);

      await configService.createConfigForTask(task.id, "FORM");

      const config = await configService.getFormConfigByTaskId(task.id);
      expect(config).toBeDefined();
      createdConfigIds.push({ table: "form_config", id: config!.id });
    });

    it("should auto-create acknowledgement config for ACKNOWLEDGEMENT task", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "Auto Ack",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task.id);

      await configService.createConfigForTask(task.id, "ACKNOWLEDGEMENT");

      const config = await configService.getAcknowledgementConfigByTaskId(task.id);
      expect(config).toBeDefined();
      createdConfigIds.push({ table: "acknowledgement_config", id: config!.id });
    });

    it("should auto-create approval config for APPROVAL task", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "Auto Approval",
        position: 0,
        type: "APPROVAL",
      });
      createdTaskIds.push(task.id);

      await configService.createConfigForTask(task.id, "APPROVAL");

      const config = await configService.getApprovalConfigByTaskId(task.id);
      expect(config).toBeDefined();
      createdConfigIds.push({ table: "approval_config", id: config!.id });
    });

    it("should auto-create file request config for FILE_REQUEST task", async () => {
      const section = await createTestSection();
      const task = await taskService.create({
        sectionId: section.id,
        title: "Auto File Request",
        position: 0,
        type: "FILE_REQUEST",
      });
      createdTaskIds.push(task.id);

      await configService.createConfigForTask(task.id, "FILE_REQUEST");

      const config = await configService.getFileRequestConfigByTaskId(task.id);
      expect(config).toBeDefined();
      createdConfigIds.push({ table: "file_request_config", id: config!.id });
    });
  });

  describe("getConfigByTaskId", () => {
    it("should return the appropriate config based on task type", async () => {
      const section = await createTestSection();

      // Create a FORM task with config
      const task = await taskService.create({
        sectionId: section.id,
        title: "Generic Get Test",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task.id);

      const created = await configService.createFormConfig(task.id);
      createdConfigIds.push({ table: "form_config", id: created.id });

      const config = await configService.getConfigByTaskId(task.id, "FORM");

      expect(config).toBeDefined();
      expect(config!.id).toBe(created.id);
    });
  });
});
