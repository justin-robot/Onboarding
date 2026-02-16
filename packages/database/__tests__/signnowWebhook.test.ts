import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signNowWebhookService, verifySignature } from "../services/signnowWebhook";
import { createHmac } from "crypto";

describe("SignNowWebhookService", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("verifySignature", () => {
    it("should verify a valid signature", () => {
      const secret = "test-secret-key";
      const payload = JSON.stringify({ event: "test", data: {} });
      const expectedSig = createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      const result = verifySignature(payload, expectedSig, secret);
      expect(result).toBe(true);
    });

    it("should reject an invalid signature", () => {
      const secret = "test-secret-key";
      const payload = JSON.stringify({ event: "test", data: {} });

      const result = verifySignature(payload, "invalid-signature", secret);
      expect(result).toBe(false);
    });

    it("should reject a tampered payload", () => {
      const secret = "test-secret-key";
      const originalPayload = JSON.stringify({ event: "test", data: {} });
      const tamperedPayload = JSON.stringify({ event: "tampered", data: {} });
      const signature = createHmac("sha256", secret)
        .update(originalPayload)
        .digest("hex");

      const result = verifySignature(tamperedPayload, signature, secret);
      expect(result).toBe(false);
    });
  });

  describe("verifyWebhook", () => {
    it("should return false when secret is not configured", () => {
      delete process.env.SIGNNOW_WEBHOOK_SECRET;

      const result = signNowWebhookService.verifyWebhook(
        '{"event": "test"}',
        "some-signature"
      );
      expect(result).toBe(false);
    });

    it("should verify webhook when secret is configured", () => {
      const secret = "test-webhook-secret";
      process.env.SIGNNOW_WEBHOOK_SECRET = secret;

      const payload = '{"event": "test", "data": {}}';
      const validSignature = createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      const result = signNowWebhookService.verifyWebhook(payload, validSignature);
      expect(result).toBe(true);
    });
  });

  describe("handleEvent", () => {
    it("should return error for unknown document", async () => {
      const result = await signNowWebhookService.handleEvent({
        event: "document.complete",
        timestamp: Date.now(),
        data: {
          document_id: "unknown-doc-id",
        },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("No e-sign config found");
    });
  });
});
