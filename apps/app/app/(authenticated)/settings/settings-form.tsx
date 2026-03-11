"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  Title,
  Text,
  TextInput,
  Button,
  Divider,
} from "@tremor/react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { UserProfile } from "@/lib/services";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username is too long")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    )
    .nullable()
    .or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface SettingsFormProps {
  initialProfile: UserProfile;
}

export function SettingsForm({ initialProfile }: SettingsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initialProfile.name,
      username: initialProfile.username ?? "",
    },
  });

  const isDirty = form.formState.isDirty;
  const errors = form.formState.errors;

  async function onSubmit(data: ProfileFormData) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          username: data.username || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      toast.success("Profile updated successfully");
      form.reset(data);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    router.push("/workspaces");
  }

  return (
    <div className="space-y-6">
      <Card>
        <Title>Profile</Title>
        <Text>Your personal information displayed across the platform</Text>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <Text className="mb-2 font-medium">Name</Text>
            <TextInput
              placeholder="Your name"
              error={!!errors.name}
              errorMessage={errors.name?.message}
              {...form.register("name")}
            />
          </div>

          <div>
            <Text className="mb-2 font-medium">Username</Text>
            <TextInput
              placeholder="username"
              error={!!errors.username}
              errorMessage={errors.username?.message}
              {...form.register("username")}
            />
            <Text className="mt-1 text-tremor-content-subtle dark:text-dark-tremor-content-subtle">
              A unique identifier for your account
            </Text>
          </div>

          <div>
            <Text className="mb-2 font-medium">Email</Text>
            <TextInput value={initialProfile.email} disabled />
            <Text className="mt-1 text-tremor-content-subtle dark:text-dark-tremor-content-subtle">
              Contact support to change your email address
            </Text>
          </div>

          <Divider />

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              loading={isSubmitting}
              loadingText="Saving..."
            >
              Save Changes
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <Title>Password</Title>
        <Text>Manage your account password</Text>

        <div className="mt-4">
          <Text className="mb-4 text-tremor-content-subtle dark:text-dark-tremor-content-subtle">
            To change your password, use the password reset flow.
          </Text>
          <Link href="/forgot-password">
            <Button variant="secondary" icon={ExternalLink}>
              Reset Password
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
