import { describe, it } from "vitest";
import { RuleTester } from "eslint";
import rule from "../src/rules/empty-line-after-use-directive.js";

describe("explicit-use-directives/empty-line-after-use-directive", () => {
  const tester = new RuleTester({
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });

  tester.run("empty-line-after-use-directive", rule, {
    valid: [
      // always: exactly one blank line
      {
        code: `"use client";\n\nimport x from "x";`,
        options: ["always"],
      },
      // never: no blank line
      {
        code: `"use client";\nimport x from "x";`,
        options: ["never"],
      },
      // no directives → rule does nothing
      {
        code: `import x from "x";`,
      },
      // multiple directives still require one blank line after the last
      {
        code: `"use client";\n"use something";\n\nconst A = 1;`,
        options: ["always"],
      },
    ],
    invalid: [
      // always: missing blank line
      {
        code: `"use client";\nimport x from "x";`,
        output: `"use client";\n\nimport x from "x";`,
        errors: [{ messageId: "expectedBlank" }],
        options: ["always"],
      },
      // always: too many blank lines
      {
        code: `"use client";\n\n\nconst x = 1;`,
        output: `"use client";\n\nconst x = 1;`,
        errors: [{ messageId: "expectedBlank" }],
        options: ["always"],
      },
      // always: five leading empty lines before code should collapse to one after directive
      {
        code: `"use client";\n\n\n\n\nexport const x = 1;`,
        output: `"use client";\n\nexport const x = 1;`,
        errors: [{ messageId: "expectedBlank" }],
        options: ["always"],
      },
      // never: remove blank line
      {
        code: `"use client";\n\nconst x = 1;`,
        output: `"use client";\nconst x = 1;`,
        errors: [{ messageId: "unexpectedBlank" }],
        options: ["never"],
      },
    ],
  });

  // eslint-disable-next-line vitest/expect-expect
  it("ran RuleTester cases", () => {});
});
