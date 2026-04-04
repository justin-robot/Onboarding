import { fileService } from "@/lib/services";
import { requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import { NextResponse, type NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/files/[id]/download - Redirect to presigned download URL
 * This endpoint allows direct file access for previews and downloads
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id } = await params;

    const file = await fileService.getByIdWithUrl(id);
    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }

    if (!file.downloadUrl) {
      return new NextResponse("Download URL not available", { status: 500 });
    }

    // Redirect to the presigned S3 URL
    return NextResponse.redirect(file.downloadUrl);
  });
}
