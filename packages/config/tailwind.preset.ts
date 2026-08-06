import type { Config } from "tailwindcss";

/**
 * Preset compartido con los tokens del diseño "Kahu" importado desde Claude
 * Design (Kahu - Sistema.dc.html, proyecto 5c86d44d-e369-49b4-9b46-0f40b5ab1830).
 * Los valores reales viven como custom properties en apps/web/src/app/globals.css;
 * este preset solo los expone como utilidades de Tailwind.
 *
 * `brand` / `brand-2` son las rampas de marca (azul / verde) del mockup. Se
 * llaman así — no `accent` — porque shadcn/ui reserva `accent` para su
 * propio rol semántico (fondo de hover neutro) en los componentes que se
 * instalan sin modificar; usar el mismo nombre para dos cosas distintas
 * rompería esos componentes. `brand-2` (verde) es un acento secundario/
 * positivo, no el color de error — para eso está `destructive` (shadcn),
 * mapeado a un tono danger (magenta) independiente de las dos rampas de marca.
 */
const tailwindPreset = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        text: "var(--color-text)",
        divider: "var(--color-divider)",
        brand: {
          DEFAULT: "var(--color-accent)",
          100: "var(--color-accent-100)",
          200: "var(--color-accent-200)",
          300: "var(--color-accent-300)",
          400: "var(--color-accent-400)",
          500: "var(--color-accent-500)",
          600: "var(--color-accent-600)",
          700: "var(--color-accent-700)",
          800: "var(--color-accent-800)",
          900: "var(--color-accent-900)",
        },
        "brand-2": {
          DEFAULT: "var(--color-accent-2)",
          100: "var(--color-accent-2-100)",
          200: "var(--color-accent-2-200)",
          300: "var(--color-accent-2-300)",
          400: "var(--color-accent-2-400)",
          500: "var(--color-accent-2-500)",
          600: "var(--color-accent-2-600)",
          700: "var(--color-accent-2-700)",
          800: "var(--color-accent-2-800)",
          900: "var(--color-accent-2-900)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          100: "var(--color-danger-100)",
          700: "var(--color-danger-700)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          100: "var(--color-warning-100)",
          700: "var(--color-warning-700)",
        },
        neutral: {
          100: "var(--color-neutral-100)",
          200: "var(--color-neutral-200)",
          300: "var(--color-neutral-300)",
          400: "var(--color-neutral-400)",
          500: "var(--color-neutral-500)",
          600: "var(--color-neutral-600)",
          700: "var(--color-neutral-700)",
          800: "var(--color-neutral-800)",
          900: "var(--color-neutral-900)",
        },
        // Capa semántica de shadcn/ui — consumida por components/ui/* sin
        // modificar. Mapeada a los tokens de marca de arriba vía CSS vars
        // en globals.css.
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      fontFamily: {
        heading: ["var(--font-heading)"],
        body: ["var(--font-body)"],
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        6: "var(--space-6)",
        8: "var(--space-8)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
    },
  },
} satisfies Partial<Config>;

export default tailwindPreset;
