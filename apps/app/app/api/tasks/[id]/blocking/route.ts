import { dependencyService } from "@/lib/services";
import { json, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/tasks/[id]/blocking - Get tasks that are blocking this one
 * Returns incomplete prerequisite tasks that must be completed first
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;

    const blockingDeps = await dependencyService.getBlockingDependencies(id);

    const blockingTasks = blockingDeps.map((dep) => ({
      id: dep.blockedByTask.id,
      title: dep.blockedByTask.title,
      status: dep.blockedByTask.status,
    }));

    return json({ blockingTasks });
  });
}
