import type { Role } from "@vetclinic/contracts";
import { BellRinging } from "@phosphor-icons/react/dist/csr/BellRinging";
import { CalendarBlank } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CalendarDots } from "@phosphor-icons/react/dist/csr/CalendarDots";
import { GearSix } from "@phosphor-icons/react/dist/csr/GearSix";
import { UsersThree } from "@phosphor-icons/react/dist/csr/UsersThree";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";

export interface NavLink {
  href: string;
  label: string;
  icon: Icon;
  roles: Role[] | "all";
}

export interface NavGroup {
  label: string;
  items: NavLink[];
}

/**
 * Agrupado por área de trabajo, como en el diseño Kahu. No incluye un grupo
 * "Clínico" (Consulta/Ficha/Carnet): esas vistas son siempre de una mascota
 * específica, no tienen sentido como link estático sin un id — aparecerán
 * como botones dentro de la ficha cuando sus historias (D1/B5/E2) existan.
 *
 * Visibilidad según la matriz de permisos de RN-18 (doc 04). Esto es solo
 * comodidad de UI — la regla real se aplica en el backend.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operación",
    items: [
      { href: "/agenda", label: "Agenda del día", icon: CalendarDots, roles: "all" },
      { href: "/semana", label: "Vista semanal", icon: CalendarBlank, roles: ["ADMIN"] },
      { href: "/recordatorios", label: "Recordatorios", icon: BellRinging, roles: "all" },
    ],
  },
  {
    label: "Directorio",
    items: [
      {
        href: "/acudientes",
        label: "Acudientes",
        icon: UsersThree,
        roles: ["ADMIN", "VETERINARIO", "RECEPCION"],
      },
    ],
  },
  {
    label: "Sistema",
    items: [{ href: "/admin", label: "Administración", icon: GearSix, roles: ["ADMIN"] }],
  },
];

export function isNavLinkVisible(link: NavLink, role: Role): boolean {
  return link.roles === "all" || link.roles.includes(role);
}
