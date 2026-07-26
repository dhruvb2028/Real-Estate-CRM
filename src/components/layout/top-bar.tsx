import Link from "next/link";
import { LogOut, Settings, UserRound } from "lucide-react";
import { logout } from "@/server/actions/auth";
import { Logo } from "@/components/layout/logo";
import { CommandMenu } from "@/components/layout/command-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, initials } from "@/lib/constants";
import type { Profile } from "@/lib/types";

export function TopBar({ profile }: { profile: Profile }) {
  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="px-safe flex h-14 items-center justify-between gap-2 md:h-16 md:px-6">
        <Link href="/dashboard" className="-my-2 flex items-center py-2 md:hidden" aria-label="EstateFlow home">
          <Logo />
        </Link>
        <div className="hidden md:block" />

        <div className="flex items-center gap-1">
          <CommandMenu />
          <ThemeToggle />
          <NotificationsBell userId={profile.id} />
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex size-11 items-center justify-center rounded-full outline-none ring-ring focus-visible:ring-2 md:size-10"
              aria-label="Account menu"
            >
              <Avatar className="size-9">
                <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {initials(profile.full_name || profile.email)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="truncate text-sm font-semibold">{profile.full_name}</p>
                <p className="truncate text-xs font-normal text-muted-foreground">
                  {ROLE_LABELS[profile.role]}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/settings" />}>
                <UserRound className="size-4" aria-hidden /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/settings" />}>
                <Settings className="size-4" aria-hidden /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={logout}>
                <DropdownMenuItem render={<button type="submit" className="w-full" />}>
                  <LogOut className="size-4" aria-hidden /> Sign out
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
