import { fileService } from "@/lib/services";
import { getStorageConfig, getPresignedDownloadUrl } from "@repo/storage";
import { requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import { NextResponse, type NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/files/[id]/thumbnail - Redirect to presigned thumbnail URL
 * Returns the thumbnail if available, otherwise falls back to the original file
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;

    const file = await fileService.getById(id);
    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }

    const config = getStorageConfig();

    // Use thumbnail if available, otherwise fall back to original
    const key = file.thumbnailKey || file.storageKey;
    const downloadUrl = await getPresignedDownloadUrl(config, key, 3600);

    if (!downloadUrl) {
      return new NextResponse("Thumbnail URL not available", { status: 500 });
    }

    // Redirect to the presigned URL
    return NextResponse.redirect(downloadUrl);
  });
}
