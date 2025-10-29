import type { Rule } from "eslint";
import * as path from "path";

type Options = [
  {
    /**
     * The directive to insert at the top if none exists yet (without quotes).
     * Required.
     */
    directive: string;
    /**
     * Glob-like ignore patterns. If a file path matches, the rule does nothing.
     * Matched against the full normalized POSIX path. For "match anywhere",
     * prefix your pattern with two asterisks followed by a slash. Supports **, *, ?.
     */
    ignore?: string[];
    /**
     * Directives that should be ignored when determining if a directive already exists.
     * Example: ["use strict"]. If present, they won't satisfy the rule.
     */
    ignoredDirectives?: string[];
    /**
     * When true, only pass if the exact configured directive exists.
     * Default: false.
     */
    requireExact?: boolean;
    /**
     * Accept any one of these exact directives. If provided and non-empty, this takes precedence.
     */
    requireOneOf?: string[];
    /**
     * File extensions (no dot) to check; replaces defaults when provided. Defaults to ["jsx","tsx"].
     */
    extensions?: string[];
    /**
     * Include files in node_modules. Defaults to false (node_modules ignored).
     */
    includeNodeModules?: boolean;
  },
];

const DEFAULTS = {
  ignore: [] as string[],
  ignoredDirectives: [] as string[],
  requireExact: false,
  requireOneOf: [] as string[],
  extensions: [] as string[],
  includeNodeModules: false,
};

const BASE_EXTENSIONS = ["jsx", "tsx"] as const;

function globToRegExp(glob: string): RegExp {
  const g = glob.split(path.sep).join("/");
  let out = "^";
  for (let i = 0; i < g.length; i++) {
    const ch = g[i]!;
    if (ch === "*") {
      if (g[i + 1] === "*") {
        while (g[i + 1] === "*") {
          i++;
        }
        if (g[i + 1] === "/") {
          i++;
        }
        out += ".*";
      } else {
        out += "[^/]*";
      }
    } else if (ch === "?") {
      out += "[^/]";
    } else {
      if ("+.^$|()[]{}".includes(ch)) {
        out += "\\" + ch;
      } else {
        out += ch;
      }
    }
  }
  out += "$";
  return new RegExp(out);
}

function compilePatterns(patterns: string[]): RegExp[] {
  return patterns.map(globToRegExp);
}

function pathMatchesAny(filePath: string, regs: RegExp[]): boolean {
  if (!regs.length) {
    return false;
  }
  const posix = filePath.split(path.sep).join("/");
  return regs.some((re) => re.test(posix));
}

/**
 * Ensures there is a top-of-file "use ..." directive. If none is present (after
 * applying ignore rules), inserts a configurable default (double-quoted).
 */
const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "enforce that a top-of-file `use ...` directive exists",
      recommended: true,
      url: "https://github.com/<you>/<repo>#rule-explicit-use-directivesrequire-use-directive-first",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          directive: {
            type: "string",
            description:
              "The directive to insert at the top if none exists yet (without quotes). Required.",
          },
          ignore: {
            type: "array",
            items: { type: "string" },
            uniqueItems: true,
            description:
              "Glob-like ignore patterns matched against the full normalized POSIX path; use **/ to match anywhere",
          },
          ignoredDirectives: {
            type: "array",
            items: { type: "string" },
            uniqueItems: true,
            description:
              "Directives that should not satisfy the rule (e.g., 'use strict')",
          },
          requireExact: {
            type: "boolean",
            description: "Only pass when the exact directive exists",
          },
          requireOneOf: {
            type: "array",
            items: { type: "string" },
            uniqueItems: true,
            description: "Accept any one of these exact directives",
          },
          extensions: {
            type: "array",
            items: { type: "string" },
            uniqueItems: true,
            description:
              'File extensions (no dot) to check; replaces defaults when provided. Defaults to ["jsx","tsx"]',
          },
          includeNodeModules: {
            type: "boolean",
            description:
              "Include files in node_modules. Defaults to false (node_modules ignored)",
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      addDirective:
        'Insert a top-of-file `use` directive (e.g., "{{directive}}").',
    },
  },

  create(context) {
    const [
      {
        directive,
        ignore = DEFAULTS.ignore,
        ignoredDirectives = DEFAULTS.ignoredDirectives,
        requireExact = DEFAULTS.requireExact,
        requireOneOf = DEFAULTS.requireOneOf,
        extensions = DEFAULTS.extensions,
        includeNodeModules = DEFAULTS.includeNodeModules,
      } = {},
    ] = context.options as Options;

    if (!directive) {
      throw new Error("Option 'directive' is required");
    }

    const filename = context.filename;

    const filenameUsable = Boolean(filename) && !filename.startsWith("<");
    if (filenameUsable) {
      const effectiveIgnorePatterns = includeNodeModules
        ? ignore
        : [...ignore, "**/node_modules/**"];
      const ignoreRegs = compilePatterns(effectiveIgnorePatterns);
      if (pathMatchesAny(filename, ignoreRegs)) {
        return {};
      }

      const ext = filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
      const effectiveExtensions =
        Array.isArray(extensions) && extensions.length > 0
          ? new Set<string>(extensions.map((e) => e.toLowerCase()))
          : new Set<string>(BASE_EXTENSIONS);
      if (!effectiveExtensions.has(ext)) {
        return {};
      }
    }

    const sourceCode = context.sourceCode;

    return {
      Program(node) {
        // gather directive prologue
        const body = node.body ?? [];
        const directives: string[] = [];
        for (const stmt of body) {
          const dir: string | undefined = (stmt as { directive?: string })
            .directive;
          if (dir) {
            directives.push(dir);
          } else {
            break;
          }
        }

        const normalizedIgnored = new Set(ignoredDirectives);

        const hasExact = directives.includes(directive);
        const hasOneOf =
          Array.isArray(requireOneOf) && requireOneOf.length > 0
            ? requireOneOf.some((d) => directives.includes(d))
            : false;

        const allowedDirectives = directives.filter(
          (d) => !normalizedIgnored.has(d),
        );
        const hasAnyUse = allowedDirectives.some((d) => d.startsWith("use "));

        // Precedence: requireOneOf -> requireExact -> any non-ignored "use ..."
        if (Array.isArray(requireOneOf) && requireOneOf.length > 0) {
          if (hasOneOf) {
            return;
          }
        } else if (requireExact) {
          if (hasExact) {
            return;
          }
        } else {
          if (hasAnyUse) {
            return;
          }
        }

        context.report({
          node,
          messageId: "addDirective",
          data: { directive },
          fix(fixer) {
            const insertionText = `"${directive}";\n`;
            const fullText = sourceCode.text ?? "";
            if (fullText.startsWith("#!")) {
              const newlineIdx = fullText.indexOf("\n");
              const shebangLen =
                newlineIdx === -1 ? fullText.length : newlineIdx + 1;
              return fixer.insertTextAfterRange([0, shebangLen], insertionText);
            }
            const firstToken = sourceCode.getFirstToken(node, {
              includeComments: false,
            });
            if (firstToken) {
              return fixer.insertTextBefore(firstToken, insertionText);
            }
            return fixer.insertTextAfterRange([0, 0], insertionText);
          },
        });
      },
    };
  },
};

export default rule;
