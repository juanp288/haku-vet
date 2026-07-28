"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/features/auth/user-menu";
import { useCurrentUser } from "@/features/auth/use-auth";
import { cn } from "@/lib/utils";
import { isNavLinkVisible, NAV_LINKS } from "./nav-links";

export function AppNav() {
  const pathname = usePathname();
  const { data } = useCurrentUser();

  if (!data) {
    return null;
  }

  const role = data.body.role;

  return (
    <nav className="flex flex-wrap items-center gap-4 px-4 py-3">
      <span className="font-heading text-lg font-semibold">VetClínica</span>
      {NAV_LINKS.filter((link) => isNavLinkVisible(link, role)).map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-sm",
              isActive ? "text-brand-700" : "hover:text-brand-700",
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <div className="flex-1" />
      <UserMenu />
    </nav>
  );
}
