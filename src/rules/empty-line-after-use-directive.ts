import type { Rule } from "eslint";

type Option = "always" | "never";
type Options = [Option?];

/**
 * Enforce a single blank line after the last top-of-file "use ..." directive.
 * Options:
 * - "always" (default): require exactly one blank line after the directive
 * - "never": require no blank line (only a single newline) after the directive
 */
const rule: Rule.RuleModule = {
  meta: {
    type: "layout",
    docs: {
      description: "enforce empty line after top-of-file `use ...` directive",
      recommended: true,
      url: "https://github.com/<you>/<repo>#rule-explicit-use-directivesempty-line-after-use-directive",
    },
    fixable: "whitespace",
    schema: [
      {
        enum: ["always", "never"],
        description:
          "Whether to require (always) or forbid (never) a blank line after the directive",
      },
    ],
    defaultOptions: ["always"],
    messages: {
      expectedBlank: "Expected a blank line after the `use` directive.",
      unexpectedBlank: "Unexpected blank line after the `use` directive.",
    },
  },

  create(context) {
    const [mode = "always"] = context.options as Options;
    const sourceCode = context.sourceCode;

    return {
      Program(node) {
        const body = node.body ?? [];
        const directives: { start: number; end: number }[] = [];
        for (const stmt of body) {
          const dir: string | undefined = (stmt as { directive?: string })
            .directive;
          if (dir) {
            const range = stmt.range;
            if (range) {
              directives.push({ start: range[0], end: range[1] });
            }
          } else {
            break;
          }
        }

        if (directives.length === 0) {
          return;
        }

        const last = directives[directives.length - 1]!;
        const first = directives[0]!;

        const fullText = sourceCode.text ?? "";

        // Handle leading whitespace before the first directive
        const leadingText = fullText.slice(0, first.start);
        if (/^\s*$/.test(leadingText) && leadingText.length > 0) {
          context.report({
            node,
            messageId: "expectedBlank",
            fix(fixer) {
              return fixer.replaceTextRange([0, first.start], "");
            },
          });
          return;
        }

        const gapStart = last.end;
        const nextStmt = body[directives.length];
        const gapEnd =
          nextStmt?.range?.[0] ?? sourceCode.text?.length ?? gapStart;
        const gapText = fullText.slice(gapStart, gapEnd);

        // Normalize Windows newlines just for counting
        const normalized = gapText.replace(/\r\n/g, "\n");

        const beginsWithNewline = normalized.startsWith("\n");
        const newlineCount = (normalized.match(/\n/g) ?? []).length;

        if (mode === "always") {
          // Expect at least one newline; for a blank line we need two newlines
          if (!(beginsWithNewline && newlineCount >= 2)) {
            context.report({
              node,
              messageId: "expectedBlank",
              fix(fixer) {
                return fixer.replaceTextRange([gapStart, gapEnd], "\n\n");
              },
            });
          } else if (newlineCount !== 2 || /[^\n\r\t \f\v]/.test(normalized)) {
            // Collapse any extra blank lines or stray spaces/tabs to exactly one blank line
            context.report({
              node,
              messageId: "expectedBlank",
              fix(fixer) {
                return fixer.replaceTextRange([gapStart, gapEnd], "\n\n");
              },
            });
          }
        } else {
          // never: exactly one newline and no extra blanks/spaces
          if (
            !beginsWithNewline ||
            newlineCount !== 1 ||
            /[^\n\r\t \f\v]/.test(normalized)
          ) {
            context.report({
              node,
              messageId: "unexpectedBlank",
              fix(fixer) {
                return fixer.replaceTextRange([gapStart, gapEnd], "\n");
              },
            });
          }
        }
      },
    };
  },
};

export default rule;
