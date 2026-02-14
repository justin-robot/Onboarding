import { formService } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ formConfigId: string }> };

/**
 * GET /api/forms/config/[formConfigId] - Get form config by ID with pages and elements
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { formConfigId } = await params;

    const form = await formService.getFormWithPagesAndElements(formConfigId);

    if (!form) {
      return errorResponse("Form not found", 404);
    }

    return json(form);
  });
}
