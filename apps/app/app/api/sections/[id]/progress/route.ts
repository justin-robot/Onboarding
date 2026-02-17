import { sectionService } from "@/lib/services";
import { json, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/sections/[id]/progress - Get section progress
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;

    const progress = await sectionService.getProgress(id);
    return json(progress);
  });
}
