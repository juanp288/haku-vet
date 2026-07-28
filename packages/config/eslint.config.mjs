// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Config base compartida. Cada app/paquete la instancia pasando su propio
 * tsconfigRootDir, porque `recommendedTypeChecked` necesita resolver el
 * tsconfig.json del paquete que se está lintiando, no el de este paquete.
 */
export function createConfig(tsconfigRootDir) {
  return tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/consistent-type-imports": "error",
      },
    },
    {
      ignores: ["dist/**", ".next/**", "node_modules/**", "*.config.*"],
    },
  );
}
