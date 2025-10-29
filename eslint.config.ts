import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import eslintPlugin from "eslint-plugin-eslint-plugin";
import n from "eslint-plugin-n";
import vitest from "@vitest/eslint-plugin";
import { ESLint } from "eslint";

export default defineConfig([
  {
    ignores: ["dist/**", "node_modules/**"],
  },

  js.configs.recommended,

  eslintPlugin.configs.recommended,
  n.configs["flat/recommended-module"],
  ...tseslint.configs.recommended,
  {
    files: ["**/*.json"],
    ...json.configs.recommended,
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["tests/**/*.{js,ts}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...vitest.environments.env.globals,
      },
    },
    plugins: {
      vitest: vitest as unknown as ESLint.Plugin,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      "eslint-plugin/consistent-output": "off",
    },
  },
  {
    files: ["src/**/*.{ts,js}"],
    rules: {
      curly: ["error", "all"],
    },
  },
]);
