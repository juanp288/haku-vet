import type { Role } from "@vetclinic/contracts";

export interface NavLink {
  href: string;
  label: string;
  roles: Role[] | "all";
}

/**
 * Secciones reales de doc 05 (app/(app)/agenda, pacientes, acudientes,
 * recordatorios, admin) — no la lista plana de pantallas del mockup, que
 * incluye vistas contextuales por paciente (Ficha, Carnet, Consulta) sin
 * sentido como enlace de navegación estático sin un id.
 *
 * Visibilidad según la matriz de permisos de RN-18 (doc 04). Esto es solo
 * comodidad de UI — la regla real se aplica en el backend.
 */
export const NAV_LINKS: NavLink[] = [
  { href: "/agenda", label: "Agenda", roles: "all" },
  { href: "/semana", label: "Semana", roles: ["ADMIN"] },
  { href: "/acudientes", label: "Acudientes", roles: ["ADMIN", "VETERINARIO", "RECEPCION"] },
  { href: "/recordatorios", label: "Recordatorios", roles: "all" },
  { href: "/admin", label: "Admin", roles: ["ADMIN"] },
];

export function isNavLinkVisible(link: NavLink, role: Role): boolean {
  return link.roles === "all" || link.roles.includes(role);
}
