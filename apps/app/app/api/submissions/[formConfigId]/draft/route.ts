import { submissionService, formService, taskService } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ formConfigId: string }> };

/**
 * GET /api/submissions/[formConfigId]/draft - Get or create draft for current user
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { formConfigId } = await params;

    const draft = await submissionService.getOrCreateDraft(formConfigId, user.id);

    // Convert responses to values object
    const values = submissionService.responsesToValues(draft.responses);

    return json({
      id: draft.id,
      formConfigId: draft.formConfigId,
      userId: draft.userId,
      status: draft.status,
      values,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    });
  });
}

/**
 * PUT /api/submissions/[formConfigId]/draft - Save draft responses
 */
export async function PUT(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { formConfigId } = await params;
    const body = await request.json();

    // Get or create draft
    const draft = await submissionService.getOrCreateDraft(formConfigId, user.id);

    // Validate body has values
    if (!body.values || typeof body.values !== "object") {
      return errorResponse("Request body must include values object", 400);
    }

    // Save responses
    await submissionService.saveResponses(draft.id, body.values);

    // Get updated submission
    const updated = await submissionService.getById(draft.id);
    if (!updated) {
      return errorResponse("Failed to get updated submission", 500);
    }

    const values = submissionService.responsesToValues(updated.responses);

    return json({
      id: updated.id,
      formConfigId: updated.formConfigId,
      userId: updated.userId,
      status: updated.status,
      values,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  });
}

/**
 * POST /api/submissions/[formConfigId]/draft - Submit the draft
 */
export async function POST(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { formConfigId } = await params;

    // Get existing draft
    const draft = await submissionService.getDraft(formConfigId, user.id);
    if (!draft) {
      return errorResponse("No draft found to submit", 404);
    }

    // Submit the draft
    const submission = await submissionService.submit(draft.id);

    // Get the form config to find the associated task
    const formConfig = await formService.getFormWithPagesAndElements(formConfigId);
    if (formConfig?.taskId) {
      // Complete the associated task
      await taskService.markComplete(formConfig.taskId);
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

/**
 * DELETE /api/submissions/[formConfigId]/draft - Delete draft
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { formConfigId } = await params;

    // Get existing draft
    const draft = await submissionService.getDraft(formConfigId, user.id);
    if (!draft) {
      return errorResponse("No draft found", 404);
    }

    await submissionService.delete(draft.id);

    return json({ success: true });
  });
}
