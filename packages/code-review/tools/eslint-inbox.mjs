import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** ESLint para arquivos avulsos em inbox/ (JS/TS, sem tsconfig do projeto alvo). */
export default tseslint.config(
  {
    ignores: ["reports/**", "node_modules/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: false,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },
);
