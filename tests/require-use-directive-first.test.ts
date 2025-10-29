import { describe, it } from "vitest";
import { RuleTester } from "eslint";
import rule from "../src/rules/require-use-directive-first.js";

describe("explicit-use-directives/require-use-directive-first", () => {
  const tester = new RuleTester({
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });

  tester.run("require-use-directive-first", rule, {
    valid: [
      // Already has the default directive ("use client") at top
      {
        filename: "/app/components/Button.tsx",
        code: `"use client";\nexport function Button(){ return <button/> }`,
        options: [{ directive: "use client" }],
      },

      // Single quotes are fine
      {
        filename: "/app/components/Thing.jsx",
        code: `'use client';\nexport default function X(){ return <div/> }`,
        options: [{ directive: "use client" }],
      },

      // Any "use ..." counts by default (no requireExact/requireOneOf)
      {
        filename: "/app/components/Server.jsx",
        code: `"use server";\nexport const x = 1;`,
        options: [{ directive: "use server" }],
      },

      // A directive prologue with multiple directives (first is still a directive)
      {
        filename: "/app/components/Multi.jsx",
        code: `"use client";\n"use something";\nconst A = 1;`,
        options: [{ directive: "use client" }],
      },

      // Comment at top shouldn't block; rule sees directive prologue only
      {
        filename: "/app/components/Commented.jsx",
        code: `/* top comment */\n"use client";\nconst A = 1;`,
        options: [{ directive: "use client" }],
      },

      // requireExact: passes only when exact directive exists
      {
        filename: "/app/components/Exact.jsx",
        code: `"use client";\nconst A = 1;`,
        options: [{ requireExact: true, directive: "use client" }],
      },

      // requireOneOf precedence (over requireExact): server is accepted
      {
        filename: "/app/components/OneOf.jsx",
        code: `"use server";\nconst A = 1;`,
        options: [
          {
            requireOneOf: ["use client", "use server"],
            requireExact: true,
            directive: "use client",
          },
        ],
      },

      // ignoredDirectives has no effect if the directive is not ignored
      {
        filename: "/app/components/NotIgnored.jsx",
        code: `"use client";\nconst A = 1;`,
        options: [
          { ignoredDirectives: ["use strict"], directive: "use client" },
        ],
      },

      // By default node_modules is ignored
      {
        filename: "/monorepo/packages/foo/node_modules/pkg/Inner.tsx",
        code: `const A = 1;`, // would normally be invalid, but ignored by default
        options: [{ directive: "use client" }],
      },

      // Ignored by path patterns
      {
        filename: "/app/pages/home/Page.tsx",
        code: `const A = 1;`,
        options: [{ ignore: ["**/pages/**"], directive: "use client" }],
      },

      // extensions override to only check .js (TSX file is then ignored entirely)
      {
        filename: "/app/components/IgnoreTsxBecauseExtensionsOverride.tsx",
        code: `const A = 1;`,
        options: [{ extensions: ["js"], directive: "use client" }],
      },

      // extensions list is case-insensitive (TSX provided as upper-case)
      {
        filename: "/app/components/Casing.tsx",
        code: `"use client";\nconst A = 1;`,
        options: [{ extensions: ["TSX"], directive: "use client" }],
      },

      // Virtual filename – skip path/ext checks; already has directive
      {
        filename: "<input>",
        code: `"use client";\nconst A = 1;`,
        options: [{ directive: "use client" }],
      },
    ],

    invalid: [
      // Missing directive on TSX → auto-insert default "use client"
      {
        filename: "/app/components/Missing.tsx",
        code: `export function A(){ return <div/> }`,
        output: `"use client";\nexport function A(){ return <div/> }`,
        errors: [{ messageId: "addDirective" }],
        options: [{ directive: "use client" }],
      },

      // With top comment: inserts AFTER the comment, BEFORE first token
      {
        filename: "/app/components/WithComment.tsx",
        code: `// heading\nimport React from "react";\nexport const A = () => <div/>;`,
        output: `// heading\n"use client";\nimport React from "react";\nexport const A = () => <div/>;`,
        errors: [{ messageId: "addDirective" }],
        options: [{ directive: "use client" }],
      },

      // Empty file → result should be just the directive + newline
      {
        filename: "/app/components/Empty.tsx",
        code: ``,
        output: `"use client";\n`,
        errors: [{ messageId: "addDirective" }],
        options: [{ directive: "use client" }],
      },

      // Shebang handling with extensions override to js: insert after shebang
      {
        filename: "/app/bin/cli.js",
        options: [{ extensions: ["js"], directive: "use client" }],
        code: `#!/usr/bin/env node\nconsole.log("hi");\n`,
        output: `#!/usr/bin/env node\n"use client";\nconsole.log("hi");\n`,
        errors: [{ messageId: "addDirective" }],
      },

      // requireExact: has "use server" but requires "use client"
      {
        filename: "/app/components/ExactFail.jsx",
        options: [{ requireExact: true, directive: "use client" }],
        code: `"use server";\nconst A = 1;`,
        output: `"use client";\n"use server";\nconst A = 1;`,
        errors: [{ messageId: "addDirective" }],
      },

      // requireOneOf provided; "use strict" alone does not satisfy
      {
        filename: "/app/components/OneOfFail.jsx",
        options: [
          {
            requireOneOf: ["use client", "use server"],
            directive: "use client",
          },
        ],
        code: `"use strict";\nconst A = 1;`,
        output: `"use client";\n"use strict";\nconst A = 1;`,
        errors: [{ messageId: "addDirective" }],
      },

      // ignoredDirectives: treat "use strict" as ignored and therefore missing
      {
        filename: "/app/components/IgnoredStrict.jsx",
        options: [
          { ignoredDirectives: ["use strict"], directive: "use client" },
        ],
        code: `"use strict";\nconst A = 1;`,
        output: `"use client";\n"use strict";\nconst A = 1;`,
        errors: [{ messageId: "addDirective" }],
      },

      // includeNodeModules: do NOT ignore node_modules; insert directive
      {
        filename: "/monorepo/packages/foo/node_modules/pkg/Inner.tsx",
        options: [{ includeNodeModules: true, directive: "use client" }],
        code: `export const x = 1;`,
        output: `"use client";\nexport const x = 1;`,
        errors: [{ messageId: "addDirective" }],
      },

      // Virtual filename "<input>": still enforce even without path/ext info
      {
        filename: "<input>",
        code: `const x = 1;`,
        output: `"use client";\nconst x = 1;`,
        errors: [{ messageId: "addDirective" }],
        options: [{ directive: "use client" }],
      },

      // extensions include tsx only; jsx file should be ignored normally,
      // but we flip it to include jsx and then fail
      {
        filename: "/app/components/OnlyJsxWhenConfigured.jsx",
        options: [{ extensions: ["jsx"], directive: "use client" }],
        code: `const A = <div/>;`,
        output: `"use client";\nconst A = <div/>;`,
        errors: [{ messageId: "addDirective" }],
      },

      // ensure extension override is case-insensitive
      {
        filename: "/app/components/UpperCaseExtProvided.JsX",
        options: [{ extensions: ["JsX"], directive: "use client" }],
        code: `const A = <div/>;`,
        output: `"use client";\nconst A = <div/>;`,
        errors: [{ messageId: "addDirective" }],
      },

      // ensure fixer inserts before first actual token when block comment exists
      {
        filename: "/app/components/BlockComment.jsx",
        code: `/* block */\nconst A = <div/>;`,
        output: `/* block */\n"use client";\nconst A = <div/>;`,
        errors: [{ messageId: "addDirective" }],
        options: [{ directive: "use client" }],
      },
    ],
  });

  // Vitest needs at least one "it" inside "describe" to show up green,
  // even though RuleTester already throws on failures.
  // eslint-disable-next-line vitest/expect-expect
  it("ran RuleTester cases", () => {
    // If we get here, RuleTester did not throw.
  });
});
