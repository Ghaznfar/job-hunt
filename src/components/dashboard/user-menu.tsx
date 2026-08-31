"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, User as UserIcon, Settings, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export function UserMenu({
  name,
  email,
  image,
  isAdmin,
}: {
  name: string | null;
  email: string;
  image: string | null;
  isAdmin: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2">
        <Avatar>
          {image ? <AvatarImage src={image} alt={name ?? email} /> : null}
          <AvatarFallback>{initials(name, email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="truncate font-medium">{name ?? "Account"}</div>
          <div className="text-muted-foreground truncate text-xs font-normal">{email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile">
            <UserIcon /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield /> Admin
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
