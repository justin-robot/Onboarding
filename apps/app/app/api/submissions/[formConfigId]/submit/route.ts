import {
  formService,
  submissionService,
  completionService,
  validateSubmission,
  taskService,
  sectionService,
} from "@/lib/services";
import { auditLogService } from "@/lib/services/auditLog";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";
import type { FormElement } from "@repo/database";

type Params = { params: Promise<{ formConfigId: string }> };

/**
 * POST /api/submissions/[formConfigId]/submit - Validate and submit form
 *
 * 1. Load form config to get validation rules
 * 2. Validate submission data with Zod
 * 3. Save responses and mark as submitted
 * 4. Trigger task completion
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { formConfigId } = await params;
    const body = await request.json();

    // 1. Load form config
    const formConfig = await formService.getFormWithPagesAndElements(formConfigId);
    if (!formConfig) {
      return errorResponse("Form config not found", 404);
    }

    // 2. Gather all elements from all pages
    const allElements: FormElement[] = formConfig.pages.flatMap(
      (page) => page.elements
    );

    // 3. Validate submission data
    const values = body.values || {};
    const validationResult = validateSubmission(allElements, values);

    if (!validationResult.success) {
      return json(
        {
          error: "Validation failed",
          errors: validationResult.errors,
        },
        400
      );
    }

    // 4. Get or create draft submission
    let draft = await submissionService.getDraft(formConfigId, user.id);
    if (!draft) {
      draft = await submissionService.getOrCreateDraft(formConfigId, user.id);
    }

    // 5. Save the validated responses
    await submissionService.saveResponses(draft.id, values);

    // 6. Submit the form
    const submission = await submissionService.submit(draft.id);

    // 7. Trigger task completion and log audit event
    if (formConfig.taskId) {
      const task = await taskService.getById(formConfig.taskId);
      if (task) {
        const section = await sectionService.getById(task.sectionId);
        if (section) {
          // Log form submission audit event
          await auditLogService.logEvent({
            workspaceId: section.workspaceId,
            eventType: "form.submitted",
            actorId: user.id,
            taskId: formConfig.taskId,
            source: "web",
            metadata: {
              taskTitle: task.title,
              formConfigId,
            },
          });
        }
      }

      const completionResult = await completionService.completeTaskForUser(
        formConfig.taskId,
        user.id
      );

      // Log completion result but don't fail submission
      if (!completionResult.success && completionResult.error !== "ALREADY_COMPLETED") {
        console.warn(
          `Form submission completed but task completion had issue: ${completionResult.error}`,
          { taskId: formConfig.taskId, userId: user.id }
        );
      }
    }

    return json({
      id: submission.id,
      formConfigId: submission.formConfigId,
      userId: submission.userId,
      status: submission.status,
      submittedAt: submission.submittedAt,
    });
  });
}
