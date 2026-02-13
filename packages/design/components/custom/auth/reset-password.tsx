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
import { resetPassword } from "@repo/auth/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle } from "lucide-react";
import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    confirmPassword: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordForm = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (error) {
      setSubmitError(
        error === "INVALID_TOKEN"
          ? "This reset link is invalid or has expired. Please request a new one."
          : "An error occurred. Please try again."
      );
    }
  }, [error]);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      setSubmitError("No reset token provided. Please use the link from your email.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSuccess(false);

    try {
      await resetPassword(
        {
          newPassword: values.password,
          token,
        },
        {
          onSuccess: () => {
            setSuccess(true);
            
            // Redirect to sign in after 2 seconds
            setTimeout(() => {
              router.push("/sign-in");
            }, 2000);
          },
          onError: (ctx: any) => {
            console.error("Reset password error:", ctx.error);
            const errorMessage = ctx.error?.message || 
              ctx.error?.body?.message ||
              "Unable to reset password. Please try again.";
            setSubmitError(errorMessage);
          },
        }
      );
    } catch (err: any) {
      console.error("Reset password error:", err);
      const errorMessage = err?.body?.message || 
        err?.message || 
        "Unable to reset password. Please try again.";
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!token && !error) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Reset your password
          </h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No reset token provided. Please use the link from your email.
          </AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/forgot-password">Request new reset link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reset your password
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter your new password below
        </p>
      </div>
      <Form {...form}>
        <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
      {success && (
        <Alert className="border-success/20 bg-success/5">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            Password reset successfully! Redirecting to sign in...
          </AlertDescription>
        </Alert>
      )}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={submitting || success}
          >
            {submitting ? "Resetting..." : "Reset password"}
          </Button>
        </form>
      </Form>
      <p className="text-muted-foreground text-center text-sm">
        Remember your password?{" "}
        <Link href="/sign-in" className="hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
};
