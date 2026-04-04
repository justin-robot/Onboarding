"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { signOut, useSession } from "@repo/auth/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@repo/design/components/ui/dropdown-menu";
import { UserAvatar } from "@repo/design/components/ui/user-avatar";
import { Button } from "@repo/design/components/ui/button";
import { LogOut, Settings, Sun, Moon, Monitor, Check } from "lucide-react";

export function UserMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const { setTheme, theme } = useTheme();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const user = session?.user;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      window.location.href = "/sign-in";
    } catch (error) {
      console.error("Sign out error:", error);
      setIsSigningOut(false);
    }
  };

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full cursor-pointer p-0">
          <UserAvatar
            name={user?.name}
            email={user?.email}
            imageUrl={user?.image}
            size="lg"
            className="pointer-events-none"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" side="top" forceMount>
        {user && (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Account Settings
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <div className="relative mr-2 h-4 w-4">
                <Sun className="absolute h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </div>
              Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {themes.map(({ value, label, icon: Icon }) => (
                <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                  {theme === value && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        {user && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isSigningOut}
              variant="destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isSigningOut ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
