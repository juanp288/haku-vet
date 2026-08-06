export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export interface AvatarColors {
  tint: string;
  ink: string;
}

/** Ciclo de 3 colores de marca, igual al diseño Kahu (azul/verde/magenta). */
const AVATAR_PALETTE: AvatarColors[] = [
  { tint: "bg-brand-100", ink: "text-brand-700" },
  { tint: "bg-brand-2-100", ink: "text-brand-2-700" },
  { tint: "bg-danger-100", ink: "text-danger-700" },
];

/** Color determinístico por id — la misma persona siempre cae en el mismo tono. */
export function getAvatarColors(seed: string): AvatarColors {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % AVATAR_PALETTE.length;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length] as AvatarColors;
}
