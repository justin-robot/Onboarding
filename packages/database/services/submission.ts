import { database } from "../index";
import type {
  FormSubmission,
  NewFormSubmission,
  FormFieldResponse,
  NewFormFieldResponse,
  FormSubmissionStatus,
} from "../schemas/main";

// Submission with all field responses
export interface SubmissionWithResponses extends FormSubmission {
  responses: FormFieldResponse[];
}

// Field value can be string, string array (for checkboxes), or null
export type FieldValue = string | string[] | null;

export const submissionService = {
  /**
   * Get or create a draft submission for a user and form config
   */
  async getOrCreateDraft(
    formConfigId: string,
    userId: string
  ): Promise<SubmissionWithResponses> {
    // Try to find existing draft
    const existing = await database
      .selectFrom("form_submission")
      .selectAll()
      .where("formConfigId", "=", formConfigId)
      .where("userId", "=", userId)
      .where("status", "=", "draft")
      .executeTakeFirst();

    if (existing) {
      const responses = await this.getResponses(existing.id);
      return { ...existing, responses };
    }

    // Create new draft
    const submission = await database
      .insertInto("form_submission")
      .values({
        formConfigId,
        userId,
        status: "draft",
        submittedAt: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { ...submission, responses: [] };
  },

  /**
   * Get a submission by ID with all responses
   */
  async getById(id: string): Promise<SubmissionWithResponses | null> {
    const submission = await database
      .selectFrom("form_submission")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!submission) return null;

    const responses = await this.getResponses(id);
    return { ...submission, responses };
  },

  /**
   * Get a user's draft for a form config
   */
  async getDraft(
    formConfigId: string,
    userId: string
  ): Promise<SubmissionWithResponses | null> {
    const submission = await database
      .selectFrom("form_submission")
      .selectAll()
      .where("formConfigId", "=", formConfigId)
      .where("userId", "=", userId)
      .where("status", "=", "draft")
      .executeTakeFirst();

    if (!submission) return null;

    const responses = await this.getResponses(submission.id);
    return { ...submission, responses };
  },

  /**
   * Get all responses for a submission
   */
  async getResponses(submissionId: string): Promise<FormFieldResponse[]> {
    const responses = await database
      .selectFrom("form_field_response")
      .selectAll()
      .where("submissionId", "=", submissionId)
      .execute();

    // Parse JSON values
    return responses.map((r) => ({
      ...r,
      value:
        typeof r.value === "string"
          ? this.tryParseJson(r.value)
          : r.value,
    }));
  },

  /**
   * Save field responses (upsert - update if exists, create if not)
   */
  async saveResponses(
    submissionId: string,
    responses: Record<string, FieldValue>
  ): Promise<FormFieldResponse[]> {
    const savedResponses: FormFieldResponse[] = [];

    for (const [elementId, value] of Object.entries(responses)) {
      // Skip null/undefined values
      if (value === null || value === undefined) continue;

      // Serialize value for storage
      const serializedValue =
        typeof value === "object" ? JSON.stringify(value) : value;

      // Try to update existing response
      const existing = await database
        .selectFrom("form_field_response")
        .selectAll()
        .where("submissionId", "=", submissionId)
        .where("elementId", "=", elementId)
        .executeTakeFirst();

      if (existing) {
        const updated = await database
          .updateTable("form_field_response")
          .set({
            value: serializedValue,
            updatedAt: new Date(),
          })
          .where("id", "=", existing.id)
          .returningAll()
          .executeTakeFirstOrThrow();

        savedResponses.push({
          ...updated,
          value: this.tryParseJson(updated.value as string),
        });
      } else {
        const created = await database
          .insertInto("form_field_response")
          .values({
            submissionId,
            elementId,
            value: serializedValue,
          })
          .returningAll()
          .executeTakeFirstOrThrow();

        savedResponses.push({
          ...created,
          value: this.tryParseJson(created.value as string),
        });
      }
    }

    // Update submission timestamp
    await database
      .updateTable("form_submission")
      .set({ updatedAt: new Date() })
      .where("id", "=", submissionId)
      .execute();

    return savedResponses;
  },

  /**
   * Submit a draft (change status to submitted)
   */
  async submit(submissionId: string): Promise<FormSubmission> {
    const submission = await database
      .updateTable("form_submission")
      .set({
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where("id", "=", submissionId)
      .where("status", "=", "draft")
      .returningAll()
      .executeTakeFirst();

    if (!submission) {
      throw new Error("Submission not found or already submitted");
    }

    return submission;
  },

  /**
   * Delete a submission and all its responses
   */
  async delete(submissionId: string): Promise<boolean> {
    // Responses will be cascade deleted
    const result = await database
      .deleteFrom("form_submission")
      .where("id", "=", submissionId)
      .executeTakeFirst();

    return (result.numDeletedRows ?? 0n) > 0n;
  },

  /**
   * Get all submissions for a form config
   */
  async getByFormConfigId(
    formConfigId: string,
    options?: { status?: FormSubmissionStatus }
  ): Promise<FormSubmission[]> {
    let query = database
      .selectFrom("form_submission")
      .selectAll()
      .where("formConfigId", "=", formConfigId);

    if (options?.status) {
      query = query.where("status", "=", options.status);
    }

    return query.orderBy("createdAt", "desc").execute();
  },

  /**
   * Helper to parse JSON safely
   */
  tryParseJson(value: unknown): unknown {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },

  /**
   * Convert responses array to a values object
   */
  responsesToValues(responses: FormFieldResponse[]): Record<string, FieldValue> {
    const values: Record<string, FieldValue> = {};
    for (const response of responses) {
      values[response.elementId] = response.value as FieldValue;
    }
    return values;
  },
};
