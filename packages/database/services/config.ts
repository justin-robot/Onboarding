import { database } from "../index";
import type {
  FormConfig,
  NewFormConfig,
  AcknowledgementConfig,
  NewAcknowledgementConfig,
  AcknowledgementConfigUpdate,
  TimeBookingConfig,
  NewTimeBookingConfig,
  TimeBookingConfigUpdate,
  ESignConfig,
  NewESignConfig,
  ESignConfigUpdate,
  FileRequestConfig,
  NewFileRequestConfig,
  FileRequestConfigUpdate,
  ApprovalConfig,
  NewApprovalConfig,
  TaskType,
} from "../schemas/main";

export const configService = {
  // =====================
  // FORM CONFIG
  // =====================

  async createFormConfig(taskId: string): Promise<FormConfig> {
    return database
      .insertInto("form_config")
      .values({ taskId })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async getFormConfigByTaskId(taskId: string): Promise<FormConfig | null> {
    const config = await database
      .selectFrom("form_config")
      .selectAll()
      .where("taskId", "=", taskId)
      .executeTakeFirst();

    return config ?? null;
  },

  // =====================
  // ACKNOWLEDGEMENT CONFIG
  // =====================

  async createAcknowledgementConfig(
    taskId: string,
    options?: { instructions?: string }
  ): Promise<AcknowledgementConfig> {
    return database
      .insertInto("acknowledgement_config")
      .values({
        taskId,
        instructions: options?.instructions ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async getAcknowledgementConfigByTaskId(taskId: string): Promise<AcknowledgementConfig | null> {
    const config = await database
      .selectFrom("acknowledgement_config")
      .selectAll()
      .where("taskId", "=", taskId)
      .executeTakeFirst();

    return config ?? null;
  },

  async updateAcknowledgementConfig(
    id: string,
    input: Omit<AcknowledgementConfigUpdate, "id" | "taskId" | "createdAt">
  ): Promise<AcknowledgementConfig | null> {
    const result = await database
      .updateTable("acknowledgement_config")
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    return result ?? null;
  },

  // =====================
  // TIME BOOKING CONFIG
  // =====================

  async createTimeBookingConfig(
    taskId: string,
    options: { bookingLink: string }
  ): Promise<TimeBookingConfig> {
    return database
      .insertInto("time_booking_config")
      .values({
        taskId,
        bookingLink: options.bookingLink,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async getTimeBookingConfigByTaskId(taskId: string): Promise<TimeBookingConfig | null> {
    const config = await database
      .selectFrom("time_booking_config")
      .selectAll()
      .where("taskId", "=", taskId)
      .executeTakeFirst();

    return config ?? null;
  },

  async updateTimeBookingConfig(
    id: string,
    input: Omit<TimeBookingConfigUpdate, "id" | "taskId" | "createdAt">
  ): Promise<TimeBookingConfig | null> {
    const result = await database
      .updateTable("time_booking_config")
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    return result ?? null;
  },

  // =====================
  // E-SIGN CONFIG
  // =====================

  async createESignConfig(
    taskId: string,
    options: { providerDocumentId: string; providerSigningUrl: string }
  ): Promise<ESignConfig> {
    return database
      .insertInto("esign_config")
      .values({
        taskId,
        providerDocumentId: options.providerDocumentId,
        providerSigningUrl: options.providerSigningUrl,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async getESignConfigByTaskId(taskId: string): Promise<ESignConfig | null> {
    const config = await database
      .selectFrom("esign_config")
      .selectAll()
      .where("taskId", "=", taskId)
      .executeTakeFirst();

    return config ?? null;
  },

  async updateESignConfig(
    id: string,
    input: Omit<ESignConfigUpdate, "id" | "taskId" | "createdAt">
  ): Promise<ESignConfig | null> {
    const result = await database
      .updateTable("esign_config")
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    return result ?? null;
  },

  // =====================
  // FILE REQUEST CONFIG
  // =====================

  async createFileRequestConfig(
    taskId: string,
    options?: { targetFolderId?: string }
  ): Promise<FileRequestConfig> {
    return database
      .insertInto("file_request_config")
      .values({
        taskId,
        targetFolderId: options?.targetFolderId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async getFileRequestConfigByTaskId(taskId: string): Promise<FileRequestConfig | null> {
    const config = await database
      .selectFrom("file_request_config")
      .selectAll()
      .where("taskId", "=", taskId)
      .executeTakeFirst();

    return config ?? null;
  },

  async updateFileRequestConfig(
    id: string,
    input: Omit<FileRequestConfigUpdate, "id" | "taskId" | "createdAt">
  ): Promise<FileRequestConfig | null> {
    const result = await database
      .updateTable("file_request_config")
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    return result ?? null;
  },

  // =====================
  // APPROVAL CONFIG
  // =====================

  async createApprovalConfig(taskId: string): Promise<ApprovalConfig> {
    return database
      .insertInto("approval_config")
      .values({ taskId })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async getApprovalConfigByTaskId(taskId: string): Promise<ApprovalConfig | null> {
    const config = await database
      .selectFrom("approval_config")
      .selectAll()
      .where("taskId", "=", taskId)
      .executeTakeFirst();

    return config ?? null;
  },

  // =====================
  // GENERIC HELPERS
  // =====================

  /**
   * Create the appropriate config for a task based on its type
   * Used for auto-creating configs when tasks are created
   */
  async createConfigForTask(taskId: string, taskType: TaskType): Promise<void> {
    switch (taskType) {
      case "FORM":
        await this.createFormConfig(taskId);
        break;
      case "ACKNOWLEDGEMENT":
        await this.createAcknowledgementConfig(taskId);
        break;
      case "TIME_BOOKING":
        // Time booking requires a booking link - can't auto-create with default
        // The config will need to be created separately with the link
        break;
      case "E_SIGN":
        // E-sign requires provider details - can't auto-create with default
        // The config will need to be created separately with provider info
        break;
      case "FILE_REQUEST":
        await this.createFileRequestConfig(taskId);
        break;
      case "APPROVAL":
        await this.createApprovalConfig(taskId);
        break;
    }
  },

  /**
   * Get config by task ID and type
   */
  async getConfigByTaskId(
    taskId: string,
    taskType: TaskType
  ): Promise<
    | FormConfig
    | AcknowledgementConfig
    | TimeBookingConfig
    | ESignConfig
    | FileRequestConfig
    | ApprovalConfig
    | null
  > {
    switch (taskType) {
      case "FORM":
        return this.getFormConfigByTaskId(taskId);
      case "ACKNOWLEDGEMENT":
        return this.getAcknowledgementConfigByTaskId(taskId);
      case "TIME_BOOKING":
        return this.getTimeBookingConfigByTaskId(taskId);
      case "E_SIGN":
        return this.getESignConfigByTaskId(taskId);
      case "FILE_REQUEST":
        return this.getFileRequestConfigByTaskId(taskId);
      case "APPROVAL":
        return this.getApprovalConfigByTaskId(taskId);
    }
  },
};
