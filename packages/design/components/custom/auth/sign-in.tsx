"use client";

import { Button } from "@repo/design/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/design/components/ui/form";
import { Input } from "@repo/design/components/ui/input";
import { Alert, AlertDescription } from "@repo/design/components/ui/alert";
import { signIn, sendVerificationEmail } from "@repo/auth/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Mail } from "lucide-react";
import * as React from "react";
import Link from "next/link";

const signInSchema = z.object({
  email: z.string().email({
    message: "Invalid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
});

type SignInFormValues = z.infer<typeof signInSchema>;

export const SignInForm = () => {
  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = React.useState(false);
  const [verificationEmail, setVerificationEmail] = React.useState("");
  const [resendingVerification, setResendingVerification] = React.useState(false);
  const [verificationSent, setVerificationSent] = React.useState(false);

  const handleResendVerification = async () => {
    setResendingVerification(true);
    setError(null);

    try {
      await sendVerificationEmail({
        email: verificationEmail,
        callbackURL: "/verify-email",
      });
      setVerificationSent(true);
    } catch (err: any) {
      console.error("Resend verification error:", err);
      setError("Failed to send verification email. Please try again.");
    } finally {
      setResendingVerification(false);
    }
  };

  const onSubmit = async (values: SignInFormValues) => {
    setSubmitting(true);
    setError(null);
    setNeedsVerification(false);
    setVerificationSent(false);

    try {
      await signIn.email(
        {
          email: values.email,
          password: values.password,
          callbackURL: "/",
        },
        {
          onSuccess: () => {
            // Redirect to dashboard on successful sign-in
            window.location.href = "/";
          },
          onError: (ctx: any) => {
            console.error("Sign in error:", ctx.error);
            
            // Check if ctx.error exists and has status
            if (ctx.error?.status === 403) {
              // Email not verified - trigger verification flow
              setVerificationEmail(values.email);
              setNeedsVerification(true);
              setError("Please verify your email address before signing in.");
              
              // Automatically resend verification email
              sendVerificationEmail({
                email: values.email,
                callbackURL: "/verify-email",
              }).then(() => {
                setVerificationSent(true);
              }).catch(console.error);
            } else {
              const errorMessage = ctx.error?.message || 
                ctx.error?.body?.message ||
                "Unable to sign in. Please check your details and try again.";
              setError(errorMessage);
            }
          },
        }
      );
    } catch (err: any) {
      console.error("Sign in error:", err);
      const errorMessage = err?.body?.message || 
        err?.message || 
        "Unable to sign in. Please check your details and try again.";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Enter your email and password to sign in
        </p>
      </div>
      <Form {...form}>
        <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          {error && !needsVerification && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {needsVerification && (
            <Alert className="border-primary/20 bg-primary/5">
              <Mail className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground space-y-2">
                <p className="font-medium">Email verification required</p>
                {verificationSent ? (
                  <p className="text-sm">
                    We've sent a verification link to <strong>{verificationEmail}</strong>. 
                    Please check your inbox and click the link to verify your account.
                  </p>
                ) : (
                  <p className="text-sm">
                    Your email address needs to be verified before you can sign in.
                  </p>
                )}
                {!verificationSent && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="mt-2"
                  >
                    {resendingVerification ? "Sending..." : "Send Verification Email"}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="name@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Form>
      <div className="flex items-center justify-between text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          Forgot password?
        </Link>
        <p className="text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/sign-up" className="hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};
