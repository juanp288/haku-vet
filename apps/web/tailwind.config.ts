import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import sharedPreset from "@vetclinic/config/tailwind-preset";

const config: Config = {
  presets: [sharedPreset],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  plugins: [tailwindcssAnimate],
};

export default config;
