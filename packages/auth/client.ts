import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authClient: any = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [adminClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;

// Export additional auth methods
export const sendVerificationEmail = authClient.sendVerificationEmail;
export const forgetPassword = authClient.requestPasswordReset;
export const resetPassword = authClient.resetPassword;
