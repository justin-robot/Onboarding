import { Resend } from "resend";
import { render } from "@react-email/components";
import { VerifyEmail } from "./templates/verify-email";
import { ResetPassword } from "./templates/reset-password";
import { WorkspaceInvitation } from "./templates/workspace-invitation";

// Use placeholder in development if RESEND_TOKEN is not set
// Resend will fail gracefully on send attempts rather than on initialization
const resendToken = process.env.RESEND_TOKEN || "re_placeholder";
console.log(`[Email] Resend initialized with token: ${resendToken ? resendToken.substring(0, 10) + "..." : "MISSING"}`);
export const resend = new Resend(resendToken);

export * from "./templates/verify-email";
export * from "./templates/reset-password";
export * from "./templates/contact";
export * from "./templates/workspace-invitation";

// Email sending helpers
export const sendVerificationEmail = async ({
  to,
  name,
  verificationUrl,
}: {
  to: string;
  name: string;
  verificationUrl: string;
}) => {
  const emailHtml = await render(
    VerifyEmail({
      name,
      verificationUrl,
    })
  );

  await resend.emails.send({
    from: process.env.RESEND_FROM || "noreply@example.com",
    to,
    subject: "Verify your email address",
    html: emailHtml,
  });
};

export const sendPasswordResetEmail = async ({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
}) => {
  const emailHtml = await render(
    ResetPassword({
      name,
      resetUrl,
    })
  );

  await resend.emails.send({
    from: process.env.RESEND_FROM || "noreply@example.com",
    to,
    subject: "Reset your password",
    html: emailHtml,
  });
};

export const sendInvitationEmail = async ({
  to,
  workspaceName,
  inviterName,
  role,
  inviteUrl,
  expiresAt,
}: {
  to: string;
  workspaceName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
}) => {
  const emailHtml = await render(
    WorkspaceInvitation({
      workspaceName,
      inviterName,
      role,
      inviteUrl,
      expiresAt,
    })
  );

  const result = await resend.emails.send({
    from: process.env.RESEND_FROM || "noreply@example.com",
    to,
    subject: `You've been invited to join ${workspaceName}`,
    html: emailHtml,
  });
  console.log("[Email] Resend response:", JSON.stringify(result, null, 2));
  if (result.error) {
    throw new Error(result.error.message);
  }
};
