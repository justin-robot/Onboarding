import { Resend } from "resend";
import { render } from "@react-email/components";
import { VerifyEmail } from "./templates/verify-email";
import { ResetPassword } from "./templates/reset-password";

// Use placeholder in development if RESEND_TOKEN is not set
// Resend will fail gracefully on send attempts rather than on initialization
export const resend = new Resend(process.env.RESEND_TOKEN || "re_placeholder");

export * from "./templates/verify-email";
export * from "./templates/reset-password";
export * from "./templates/contact";

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
