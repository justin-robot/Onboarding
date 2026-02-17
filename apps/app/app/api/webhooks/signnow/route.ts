import { NextRequest, NextResponse } from "next/server";
import {
  signNowWebhookService,
  type SignNowWebhookPayload,
} from "@/lib/services";

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signnow-signature") || "";

    const isValid = signNowWebhookService.verifyWebhook(rawBody, signature);
    if (!isValid) {
      console.warn("Invalid SignNow webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    let payload: SignNowWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    if (!payload.event || !payload.data?.document_id) {
      return NextResponse.json(
        { error: "Missing required fields: event, data.document_id" },
        { status: 400 }
      );
    }

    const result = await signNowWebhookService.handleEvent(payload);

    console.log("SignNow webhook processed:", {
      event: payload.event,
      documentId: payload.data.document_id,
      success: result.success,
      message: result.message,
    });

    return NextResponse.json({
      success: result.success,
      event: result.event,
      message: result.message,
    });
  } catch (error) {
    console.error("Error processing SignNow webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

export const GET = (): NextResponse => {
  return NextResponse.json({ status: "SignNow webhook endpoint active" });
};
