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
import { Avatar, AvatarFallback, AvatarImage } from "@repo/design/components/ui/avatar";
import { Button } from "@repo/design/components/ui/button";
import { LogOut, Settings, Sun, Moon, Monitor, Check } from "lucide-react";

export function UserMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const { setTheme, theme } = useTheme();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const user = session?.user;

  if (!user) {
    return null;
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.charAt(0).toUpperCase() ?? "?";

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
        <Button variant="ghost" className="relative h-9 w-9 rounded-full cursor-pointer">
          <Avatar className="h-9 w-9 pointer-events-none">
            {user.image && <AvatarImage src={user.image} alt={user.name ?? "User"} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Account Settings
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="ml-6">Theme</span>
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
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isSigningOut}
          variant="destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isSigningOut ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
