import type { Config } from "tailwindcss";
import sharedPreset from "@vetclinic/config/tailwind-preset";

const config: Config = {
  presets: [sharedPreset],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  plugins: [require("tailwindcss-animate")],
};

export default config;
