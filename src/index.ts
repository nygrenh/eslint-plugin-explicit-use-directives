import { readFileSync } from "fs";
import type { ESLint } from "eslint";
import rule from "./rules/require-use-directive-first.js";
import emptyLineRule from "./rules/empty-line-after-use-directive.js";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

const plugin: ESLint.Plugin = {
  meta: {
    name: pkg.name,
    version: pkg.version,
    namespace: "explicit-use-directives",
  },
  rules: {
    "require-use-directive-first": rule,
    "empty-line-after-use-directive": emptyLineRule,
  },
  configs: {
    "prefer-use-client": {},
    "prefer-use-server": {},
  },
};

if (!plugin.configs) {
  throw new Error("plugin.configs is undefined");
}

// attach the real plugin after object creation (pattern suggested in docs)
Object.assign(plugin.configs, {
  "prefer-use-client": {
    name: "explicit-use-directives/prefer-use-client",
    plugins: { "explicit-use-directives": plugin },
    rules: {
      "explicit-use-directives/require-use-directive-first": [
        "error",
        { directive: "use client" },
      ],
      "explicit-use-directives/empty-line-after-use-directive": [
        "error",
        "always",
      ],
    },
  },
  "prefer-use-server": {
    name: "explicit-use-directives/prefer-use-server",
    plugins: { "explicit-use-directives": plugin },
    rules: {
      "explicit-use-directives/require-use-directive-first": [
        "error",
        { directive: "use server" },
      ],
      "explicit-use-directives/empty-line-after-use-directive": [
        "error",
        "always",
      ],
    },
  },
});

export default plugin;
