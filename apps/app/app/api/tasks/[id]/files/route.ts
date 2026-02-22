import { fileService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/tasks/[id]/files - Get all files uploaded for a task
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;

    const files = await fileService.getByTaskId(id);

    return json({ files });
  });
}
