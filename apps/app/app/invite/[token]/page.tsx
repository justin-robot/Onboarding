"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@repo/auth/client";
import { Button } from "@repo/design/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/design/components/ui/card";
import { Alert, AlertDescription } from "@repo/design/components/ui/alert";
import {
  Loader2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  LogIn,
} from "lucide-react";

interface InvitationDetails {
  email: string;
  role: string;
  workspaceId: string;
  workspaceName: string;
  inviterName: string;
  expiresAt: string;
}

function formatRole(role: string): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "user":
      return "Member";
    default:
      return role;
  }
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const { data: session, isPending: sessionLoading } = useSession();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Fetch invitation details
  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/${token}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load invitation");
        }

        const data = await response.json();
        setInvitation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invitation");
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  // Handle accept invitation
  const handleAccept = async () => {
    setAccepting(true);
    setError(null);

    try {
      const response = await fetch("/api/invitations/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to accept invitation");
      }

      const data = await response.json();
      setAccepted(true);

      // Redirect to workspace after short delay
      setTimeout(() => {
        router.push(`/workspace/${data.workspaceId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
      setAccepting(false);
    }
  };

  // Handle sign in redirect
  const handleSignIn = () => {
    // Store the invite token in sessionStorage to use after sign-in
    sessionStorage.setItem("pendingInviteToken", token);
    router.push("/sign-in");
  };

  // Loading state
  if (loading || sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/")}
            >
              Go to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Accepted state
  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle className="mt-4">Welcome!</CardTitle>
            <CardDescription>
              You've joined {invitation?.workspaceName}. Redirecting...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Main invitation view
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mt-4">You're Invited!</CardTitle>
          <CardDescription>
            {invitation?.inviterName} invited you to join
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 text-center">
            <p className="text-lg font-semibold">{invitation?.workspaceName}</p>
            <p className="text-sm text-muted-foreground">
              as {formatRole(invitation?.role || "user")}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              Expires{" "}
              {invitation?.expiresAt
                ? new Date(invitation.expiresAt).toLocaleDateString()
                : "soon"}
            </span>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          {session?.user ? (
            // Check if logged-in email matches invitation email
            session.user.email?.toLowerCase() === invitation?.email?.toLowerCase() ? (
              <>
                <Button
                  className="w-full"
                  onClick={handleAccept}
                  disabled={accepting}
                >
                  {accepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Accept Invitation"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Signed in as {session.user.email}
                </p>
              </>
            ) : (
              // Email mismatch warning
              <>
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertDescription className="text-amber-800 text-sm">
                    <strong>Email mismatch:</strong> This invitation was sent to{" "}
                    <strong>{invitation?.email}</strong>, but you're signed in as{" "}
                    <strong>{session.user.email}</strong>.
                    <br />
                    <br />
                    Please sign out and sign in with the correct email to accept this invitation.
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/sign-in")}
                >
                  Sign in with different account
                </Button>
              </>
            )
          ) : (
            <>
              <Button className="w-full" onClick={handleSignIn}>
                <LogIn className="mr-2 h-4 w-4" />
                Sign in to Accept
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Don't have an account?{" "}
                <a href="/sign-up" className="underline hover:text-foreground">
                  Sign up
                </a>
              </p>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
