"use client";

import { SignOut } from "@phosphor-icons/react/dist/csr/SignOut";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_LABELS } from "@/features/auth/role-labels";
import { useCurrentUser, useLogout } from "@/features/auth/use-auth";
import { getInitials } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { isNavLinkVisible, NAV_GROUPS } from "./nav-links";

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useCurrentUser();
  const logout = useLogout();

  if (!data) {
    return null;
  }

  const user = data.body;

  return (
    <aside className="flex h-screen w-[252px] flex-none flex-col gap-[22px] self-start border-r border-border bg-card px-3.5 py-4.5">
      <div className="flex items-center gap-[11px] px-1.5 py-1">
        <img
          src="/logo.jpeg"
          alt="Kahu"
          width={38}
          height={38}
          className="rounded-[11px] object-cover"
        />
        <div>
          <div className="text-[16px] font-extrabold leading-tight tracking-[-0.01em]">
            Kahu
          </div>
          <div className="text-[11px] font-medium text-neutral-600">Tienda veterinaria</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((link) => isNavLinkVisible(link, user.role));
          if (items.length === 0) {
            return null;
          }
          return (
            <div key={group.label}>
              <div className="mb-[7px] px-2 text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-neutral-500">
                {group.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {items.map((link) => {
                  const isActive =
                    pathname === link.href || pathname.startsWith(`${link.href}/`);
                  const LinkIcon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-[10px] rounded-[10px] px-2.5 py-[9px] text-[13.5px] transition-colors",
                        isActive
                          ? "bg-brand-100 font-bold text-brand-700"
                          : "font-semibold text-neutral-700 hover:bg-muted",
                      )}
                    >
                      <LinkIcon size={18} weight="duotone" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-border pt-3">
        <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-[13px] font-bold text-white">
          {getInitials(user.fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold">{user.fullName}</div>
          <div className="text-[11px] text-neutral-600">{ROLE_LABELS[user.role]}</div>
        </div>
        <button
          type="button"
          title="Salir"
          aria-label="Salir"
          className="flex-none rounded-lg p-1 text-neutral-500 transition-colors hover:bg-muted hover:text-foreground"
          onClick={() =>
            logout.mutate({ body: {} }, { onSuccess: () => router.push("/login") })
          }
        >
          <SignOut size={18} weight="duotone" />
        </button>
      </div>
    </aside>
  );
}
