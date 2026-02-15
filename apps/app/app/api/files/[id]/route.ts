import { fileService } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/files/[id] - Get file info with download URL
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;

    const file = await fileService.getByIdWithUrl(id);
    if (!file) {
      return errorResponse("File not found", 404);
    }

    return json({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      url: file.downloadUrl,
      thumbnailKey: file.thumbnailKey,
      uploadedBy: file.uploadedBy,
      createdAt: file.createdAt,
    });
  });
}
