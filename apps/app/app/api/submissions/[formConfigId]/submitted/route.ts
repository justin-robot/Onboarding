import { submissionService, formService, memberService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";
import { database } from "@repo/database";

type Params = { params: Promise<{ formConfigId: string }> };

/**
 * GET /api/submissions/[formConfigId]/submitted - Get submitted form data
 * Query params:
 *   - userId: (optional) View a specific user's submission (admin only)
 * Returns the submission with values and form config (for field labels/structure)
 */
export async function GET(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { formConfigId } = await params;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    // Determine which user's submission to fetch
    let submissionUserId = user.id;

    // If a specific userId is requested, verify admin access
    if (targetUserId && targetUserId !== user.id) {
      // Get workspace ID from form config -> task -> section
      const formConfig = await database
        .selectFrom("form_config")
        .select("taskId")
        .where("id", "=", formConfigId)
        .executeTakeFirst();

      if (!formConfig) {
        return errorResponse("Form configuration not found", 404);
      }

      const task = await database
        .selectFrom("task")
        .innerJoin("section", "section.id", "task.sectionId")
        .select("section.workspaceId")
        .where("task.id", "=", formConfig.taskId)
        .executeTakeFirst();

      if (!task) {
        return errorResponse("Task not found", 404);
      }

      // Check if requester is admin
      const membership = await memberService.getMember(task.workspaceId, user.id);
      if (!membership || membership.role !== "admin") {
        return errorResponse("Only admins can view other users' submissions", 403);
      }

      submissionUserId = targetUserId;
    }

    // Get all submissions for this form config with "submitted" status
    const submissions = await submissionService.getByFormConfigId(formConfigId, {
      status: "submitted",
    });

    // Find the target user's submission
    const userSubmission = submissions.find((s) => s.userId === submissionUserId);

    if (!userSubmission) {
      return errorResponse("No submission found", 404);
    }

    // Get the responses for this submission
    const responses = await submissionService.getResponses(userSubmission.id);
    const values = submissionService.responsesToValues(responses);

    // Get the form config with pages and elements
    const formConfig = await formService.getFormWithPagesAndElements(formConfigId);

    if (!formConfig) {
      return errorResponse("Form configuration not found", 404);
    }

    return json({
      submission: {
        id: userSubmission.id,
        status: userSubmission.status,
        submittedAt: userSubmission.submittedAt,
        createdAt: userSubmission.createdAt,
      },
      values,
      formConfig: {
        id: formConfig.id,
        pages: formConfig.pages.map((page) => ({
          id: page.id,
          title: page.title,
          position: page.position,
          elements: page.elements.map((el) => ({
            id: el.id,
            type: el.type,
            label: el.label,
            options: el.options,
            position: el.position,
          })),
        })),
      },
    });
  });
}
