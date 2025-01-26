import globals from "globals";
import js from "@eslint/js";
import ts from "typescript-eslint";

export default [
  { ignores: ["node_modules", "dist"] },
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  js.configs.recommended,
  ...ts.configs.recommended
];
