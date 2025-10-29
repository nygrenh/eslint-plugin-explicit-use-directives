# eslint-plugin-explicit-use-directives

Some frameworks use **`"use"` directives** at the top of files to change how the contents of the file should be run or rendered. For example, in the _Next.js app router_, all components are _Server Components_ by default unless you add `"use client"` as the first line of the file. This can violate [the principle of least surprise](https://en.wikipedia.org/wiki/Principle_of_least_astonishment), because a component might render only on the server when you expect it to also run in the browser.

This plugin fixes that by making these directives **explicit**. It ensures that all (.jsx and .tsx) files start with either `"use server"` or `"use client"`. You can also choose whichever directive you prefer. The plugin also **autofixes** missing directives automatically. See the configuration options for for further customizability.

## Getting started

```bash
npm install --save-dev eslint-plugin-explicit-use-directives
```

**eslint.config.js**

```js
import explicitUse from "eslint-plugin-explicit-use-directives";
export default [
  // Prefer "use server" by default:
  explicitUse.configs["prefer-use-server"],

  // Or prefer "use client" by default:
  // explicitUse.configs["prefer-use-client"],
];
```

## Examples

### Insert `"use server"` and enforce an empty line (`always`)

```js
// Config snippet
import explicitUse from "eslint-plugin-explicit-use-directives";

export default [
  {
    plugins: { "explicit-use-directives": explicitUse },
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
];
```

**Before**

```js
export async function getUserData(id) {
  const res = await fetch(`https://api.example.com/users/${id}`);
  return res.json();
}
```

**After (autofixed)**

```js
"use server";

export async function getUserData(id) {
  const res = await fetch(`https://api.example.com/users/${id}`);
  return res.json();
}
```

### Insert `"use client"` and enforce no empty line (`never`)

```js
// Config snippet
import explicitUse from "eslint-plugin-explicit-use-directives";

export default [
  {
    plugins: { "explicit-use-directives": explicitUse },
    rules: {
      "explicit-use-directives/require-use-directive-first": [
        "error",
        { directive: "use client" },
      ],
      "explicit-use-directives/empty-line-after-use-directive": [
        "error",
        "never",
      ],
    },
  },
];
```

**Before**

```js
import { useState, useEffect } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("Counter mounted");
  }, []);

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

**After (autofixed)**

```js
"use client";
import { useState, useEffect } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("Counter mounted");
  }, []);

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

## Rules

**`explicit-use-directives/require-use-directive-first`**
Ensures a top-of-file `use ...` directive exists and inserts it automatically if missing.

### Options (require-use-directive-first)

| Option                 | Type     | Description                                                                          | Default          | Example                                                                                         |
| ---------------------- | -------- | ------------------------------------------------------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------- |
| **directive**          | string   | The directive to insert when missing. **Required.**                                  | -                | `directive: "use server"` inserts `"use server"` at the top of missing files.                   |
| **ignore**             | string[] | Glob-like patterns matched against the full POSIX path. Use `**/` to match anywhere. | `[]`             | `ignore: ["**/pages/**", "**/tests/**"]` skips those folders.                                   |
| **ignoredDirectives**  | string[] | Directives that should not satisfy the rule (for example, `"use strict"`).           | `[]`             | `ignoredDirectives: ["use strict"]` still inserts `"use client"` even if `"use strict"` exists. |
| **requireExact**       | boolean  | Only pass when the exact configured directive exists.                                | `false`          | `requireExact: true` with `directive: "use client"` fails if the file has `"use server"`.       |
| **requireOneOf**       | string[] | Accept any one of these exact directives. Takes precedence over `requireExact`.      | `[]`             | `requireOneOf: ["use client", "use server"]` passes if the file has either.                     |
| **extensions**         | string[] | File extensions (without dot) to check. Replaces defaults when provided.             | `["jsx", "tsx"]` | `extensions: ["js", "ts", "tsx"]` also checks `.js` and `.ts` files.                            |
| **includeNodeModules** | boolean  | Include files inside `node_modules`.                                                 | `false`          | `includeNodeModules: true` runs the rule even in `node_modules`.                                |

**`explicit-use-directives/empty-line-after-use-directive`**
Enforces whether there should be a blank line after the last top-of-file `use ...` directive. Autofixable.

### Options (empty-line-after-use-directive)

| Option | Type   | Description                                          | Default  | Example                                      |
| ------ | ------ | ---------------------------------------------------- | -------- | -------------------------------------------- |
| value  | string | Layout mode for blank line after the last directive. | `always` | `["error", "never"]` removes the blank line. |
