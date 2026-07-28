"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "./role-labels";
import { useCurrentUser, useLogout, useSessionRefresh } from "./use-auth";

export function UserMenu() {
  const router = useRouter();
  const { data } = useCurrentUser();
  const logout = useLogout();
  useSessionRefresh(!!data);

  if (!data) {
    return null;
  }

  const user = data.body;

  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] opacity-65">
        {user.fullName} · {ROLE_LABELS[user.role]}
      </span>
      <Button
        type="button"
        variant="ghost"
        onClick={() =>
          logout.mutate({ body: {} }, { onSuccess: () => router.push("/login") })
        }
      >
        Salir
      </Button>
    </div>
  );
}
