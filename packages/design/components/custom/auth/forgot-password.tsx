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
import { forgetPassword } from "@repo/auth/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import * as React from "react";
import Link from "next/link";

const forgotPasswordSchema = z.object({
  email: z.string().email({
    message: "Invalid email address.",
  }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordForm = () => {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await forgetPassword(
        {
          email: values.email,
          redirectTo: "/reset-password",
        },
        {
          onSuccess: () => {
            setSuccess(true);
            form.reset();
          },
          onError: (ctx: any) => {
            console.error("Forgot password error:", ctx.error);
            const errorMessage = ctx.error?.message || 
              ctx.error?.body?.message ||
              "Unable to send reset email. Please try again.";
            setError(errorMessage);
          },
        }
      );
    } catch (err: any) {
      console.error("Forgot password error:", err);
      const errorMessage = err?.body?.message || 
        err?.message || 
        "Unable to send reset email. Please try again.";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Forgot your password?
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>
      <Form {...form}>
        <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-success/20 bg-success/5">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                Password reset link sent! Check your email for instructions.
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
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      </Form>
      <div className="flex items-center justify-center">
        <Link
          href="/sign-in"
          className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
};
