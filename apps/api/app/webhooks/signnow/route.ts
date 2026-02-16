import { NextRequest, NextResponse } from "next/server";
import {
  signNowWebhookService,
  type SignNowWebhookPayload,
} from "@repo/database";

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-signnow-signature") || "";

    // Verify webhook signature
    const isValid = signNowWebhookService.verifyWebhook(rawBody, signature);
    if (!isValid) {
      console.warn("Invalid SignNow webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse the payload
    let payload: SignNowWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!payload.event || !payload.data?.document_id) {
      return NextResponse.json(
        { error: "Missing required fields: event, data.document_id" },
        { status: 400 }
      );
    }

    // Handle the webhook event
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

// Optionally handle GET for webhook verification (some providers do this)
export const GET = (): NextResponse => {
  return NextResponse.json({ status: "SignNow webhook endpoint active" });
};
