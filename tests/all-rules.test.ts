import { describe, it, expect } from "vitest";
import { ESLint } from "eslint";
import plugin from "../src/index.js";

async function runWithBothRules(
  code: string,
  emptyLineMode: "always" | "never" = "always",
): Promise<string> {
  const eslint = new ESLint({
    fix: true,
    overrideConfig: [
      {
        languageOptions: {
          ecmaVersion: 2024,
          sourceType: "module",
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: {
          "explicit-use-directives": plugin as unknown as ESLint.Plugin,
        },
        rules: {
          "explicit-use-directives/require-use-directive-first": [
            "error",
            { directive: "use client" },
          ],
          "explicit-use-directives/empty-line-after-use-directive": [
            "error",
            emptyLineMode,
          ],
        },
      },
    ],
  });
  const results = await eslint.lintText(code, { filePath: "File.tsx" });
  return results[0]?.output ?? code;
}

describe("both rules working together", () => {
  it("inserts directive then adds blank line (always mode)", async () => {
    const input = `export const A = () => <div/>;`;
    const output = await runWithBothRules(input, "always");
    expect(output).toBe(`"use client";\n\nexport const A = () => <div/>;`);
  });

  it("collapses multiple blank lines to one (always mode)", async () => {
    const input = `"use client";\n\n\n\nconst x = 1;`;
    const output = await runWithBothRules(input, "always");
    expect(output).toBe(`"use client";\n\nconst x = 1;`);
  });

  it("removes blank line when configured never", async () => {
    const input = `"use client";\n\nimport x from "x";`;
    const output = await runWithBothRules(input, "never");
    expect(output).toBe(`"use client";\nimport x from "x";`);
  });

  it("handles file with no directive and too many blank lines", async () => {
    const input = `\n\n\n\nexport const x = 1;`;
    const output = await runWithBothRules(input, "always");
    // Both rules work together: require rule adds directive, empty line rule collapses leading whitespace
    expect(output).toBe(`"use client";\n\nexport const x = 1;`);
  });
});
