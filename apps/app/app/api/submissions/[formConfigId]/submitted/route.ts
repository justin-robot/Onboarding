import { submissionService, formService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ formConfigId: string }> };

/**
 * GET /api/submissions/[formConfigId]/submitted - Get submitted form data for current user
 * Returns the submission with values and form config (for field labels/structure)
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { formConfigId } = await params;

    // Get all submissions for this form config with "submitted" status
    const submissions = await submissionService.getByFormConfigId(formConfigId, {
      status: "submitted",
    });

    // Find the current user's submission
    const userSubmission = submissions.find((s) => s.userId === user.id);

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
