# npm Workspace Learning

A small, educational Node.js monorepo for practicing:

- npm workspaces
- creating your own package
- using a workspace package from another workspace
- npm scripts
- updating packages

This is **not** a production app. It is intentionally simple so you can focus on npm concepts.

---

## Project structure

```text
npm-workspace-learning/
├── package.json                 # root: defines workspaces + scripts
├── README.md
│
├── apps/
│   ├── app/                     # app #1: uses math-utils directly
│   │   ├── package.json
│   │   └── index.js
│   └── reporter/                # app #2: uses both services
│       ├── package.json
│       └── index.js
│
├── services/
│   ├── pricing-service/         # service #1: uses math-utils
│   │   ├── package.json
│   │   ├── index.js
│   │   └── run.js
│   └── stats-service/           # service #2: uses math-utils
│       ├── package.json
│       ├── index.js
│       └── run.js
│
└── packages/
    └── math-utils/              # shared library used by services + apps
        ├── package.json
        ├── index.js
        └── test.js
```

### Dependency map (important)

```text
apps/app  ----------------------+
                                |
                                v
                         packages/math-utils
                                ^
                                |
services/pricing-service -------+
services/stats-service ---------+
        ^               ^
        |               |
        +-------+-------+
                |
           apps/reporter
```

This shows three levels:

1. **packages/** — shared libraries
2. **services/** — domain logic built on packages
3. **apps/** — runnable programs that use packages and/or services

---

## Quick start

Run these commands from the `npm-workspace-learning/` folder:

```bash
# 1. Install everything from the root (required once)
npm install

# 2. Run app #1 (uses math-utils + chalk)
npm run start:app

# 3. Run app #2 (uses both services)
npm run start:reporter

# 4. Run each service on its own
npm run start:pricing
npm run start:stats

# 5. Same idea with explicit --workspace flags
npm run start --workspace=app
npm run start --workspace=reporter
npm run start --workspace=@learning/pricing-service
npm run start --workspace=@learning/stats-service

# 6. Run the package tests
npm test --workspace=@learning/math-utils
```

> Note: `--workspace=` matches the package **name** in `package.json`, not always the folder name.
> Examples:
> - folder `apps/app` → name `app`
> - folder `services/pricing-service` → name `@learning/pricing-service`
> - folder `packages/math-utils` → name `@learning/math-utils`

---

## Part 1 — Workspace

### What is a monorepo?

A **monorepo** is a single Git repository that contains multiple related projects.

In this repo you have:

- two **apps** (`apps/app`, `apps/reporter`)
- two **services** (`services/pricing-service`, `services/stats-service`)
- one **shared package** (`packages/math-utils`)

They live side by side, but each has its own `package.json`.

### What is an npm workspace?

An **npm workspace** tells npm:

> “Treat these folders as packages that belong to one project.”

When you run `npm install` at the root, npm:

1. Finds every workspace package
2. Installs their dependencies
3. Links local packages to each other when one depends on another

That last part is the key learning goal of this project.

### Why do we have `apps`, `services`, and `packages`?

This is a common monorepo convention:

| Folder | Purpose | Examples in this repo |
|--------|---------|------------------------|
| `apps/` | Runnable applications end users or demos start | `app`, `reporter` |
| `services/` | Domain/business logic modules (often used by apps) | `pricing-service`, `stats-service` |
| `packages/` | Small reusable libraries shared everywhere | `math-utils` |

You *could* put everything in one flat folder. Separating them makes ownership clearer:

- change math once → both services benefit
- change pricing logic once → every app that depends on pricing benefits

### What does this mean?

```json
"workspaces": [
  "apps/*",
  "services/*",
  "packages/*"
]
```

It means:

- every folder directly inside `apps/` is a workspace package
- every folder directly inside `services/` is a workspace package
- every folder directly inside `packages/` is a workspace package

So npm automatically discovers:

- `apps/app`
- `apps/reporter`
- `services/pricing-service`
- `services/stats-service`
- `packages/math-utils`

The root `package.json` also has `"private": true`. That prevents someone from accidentally publishing the whole monorepo as a single npm package.

---

## Part 2 — Creating a package

### `npm init`

Interactive setup. npm asks questions:

- package name
- version
- description
- entry point
- etc.

Useful when you want control over each field.

### `npm init -y`

Creates a `package.json` immediately with defaults (`-y` = “yes to all”).

Useful when you want to start fast and edit the file yourself.

In this project, the package files are already written for you. In real life you might create a new package like this:

```bash
mkdir packages/my-package
cd packages/my-package
npm init -y
```

Then edit `name`, `main`, and scripts.

### Important `package.json` fields

```json
{
  "name": "@learning/math-utils",
  "version": "1.0.0",
  "main": "index.js"
}
```

| Field | Why it matters |
|-------|----------------|
| `name` | How other packages require it: `require("@learning/math-utils")` |
| `version` | Semantic version of *this* package |
| `main` | File Node loads when someone requires the package |

The `@learning/` prefix is a **scope**. Scoped names are common for organizations and for private/local packages. It is not required, but it makes ownership clear.

---

## Part 3 — Using custom packages and services

This repo shows **two consumption patterns**.

### Pattern A — App uses a package directly

```text
apps/app
    ↓ depends on
@learning/math-utils
    ↓ resolved to
packages/math-utils
```

In `apps/app/package.json`:

```json
"dependencies": {
  "@learning/math-utils": "*",
  "chalk": "^4.1.2"
}
```

In `apps/app/index.js`:

```js
const { add, subtract, multiply } = require("@learning/math-utils");
```

### Pattern B — App uses services, services use the package

```text
apps/reporter
    ↓ depends on
@learning/pricing-service   and   @learning/stats-service
    ↓                                    ↓
packages/math-utils              packages/math-utils
```

In `apps/reporter/package.json`:

```json
"dependencies": {
  "@learning/pricing-service": "*",
  "@learning/stats-service": "*"
}
```

In `apps/reporter/index.js`:

```js
const { calculateTotal } = require("@learning/pricing-service");
const { average } = require("@learning/stats-service");
```

The reporter app never imports `math-utils` itself. It still benefits from it indirectly, because both services depend on it.

### How workspace linking works

`"*"` means: accept any version. In a workspace, that usually means “use the local one.”

Notice: nobody does this:

```js
require("../../packages/math-utils"); // avoid this
```

Instead every consumer uses a normal package name. That is the point of workspaces:

- code thinks it is using a published package
- npm secretly links it to the local folder

After `npm install`, npm creates symlinks (or equivalent) so Node can resolve:

- `@learning/math-utils` → `packages/math-utils`
- `@learning/pricing-service` → `services/pricing-service`
- `@learning/stats-service` → `services/stats-service`

### Why this matters

You can later publish a package/service to npm and keep the same `require()` calls. During local development, workspace links save you from publishing every change.

---

## Part 4 — npm scripts

### Scripts in this project

Root `package.json`:

```json
"scripts": {
  "start": "npm run start --workspace=app",
  "start:app": "npm run start --workspace=app",
  "start:reporter": "npm run start --workspace=reporter",
  "start:pricing": "npm run start --workspace=@learning/pricing-service",
  "start:stats": "npm run start --workspace=@learning/stats-service",
  "start:all": "npm run start --workspaces --if-present",
  "test:package": "npm test --workspace=@learning/math-utils"
}
```

Each workspace also defines its own `start` (and math-utils defines `test`).

### Commands to run

From the project root:

```bash
# Apps
npm run start:app
npm run start:reporter

# Services
npm run start:pricing
npm run start:stats

# Same idea, written explicitly
npm run start --workspace=app
npm run start --workspace=reporter
npm run start --workspace=@learning/pricing-service
npm run start --workspace=@learning/stats-service

# Run start in every workspace that has a start script
npm run start:all

# Tests
npm test --workspace=@learning/math-utils
npm run test:package
```

### Why `--workspace=` works

`--workspace=app` tells npm:

> “Run this command in the workspace whose package name is `app`.”

So:

```bash
npm run start --workspace=app
```

means:

1. find the workspace named `app`
2. run *its* `start` script
3. which executes `node index.js` inside `apps/app`

You do not need to `cd apps/app` first.

Important detail:

| Flag | Matches |
|------|---------|
| `--workspace=app` | package name `"name": "app"` |
| `--workspace=reporter` | package name `"name": "reporter"` |
| `--workspace=@learning/pricing-service` | package name `"name": "@learning/pricing-service"` |
| `--workspace=@learning/math-utils` | package name `"name": "@learning/math-utils"` |

The folder can be `services/pricing-service`, but the workspace flag uses the **package name**.

### `npm run <script>` vs `npm <command>`

| Form | Meaning | Example |
|------|---------|---------|
| `npm run <script>` | Runs a script defined in `package.json` under `"scripts"` | `npm run start:app` |
| `npm <command>` | Runs a built-in npm command | `npm test`, `npm install`, `npm outdated` |

Special case: npm allows short forms for a few lifecycle scripts:

```bash
npm test          # same idea as npm run test
npm start         # same idea as npm run start
```

But custom script names always need `npm run`:

```bash
npm run start:app
# not: npm start:app
```

---

## Part 5 — Updating packages

This project includes one small external dependency in the app:

```json
"chalk": "^4.1.2"
```

It is only there so you can practice update commands. It is not required for the math demo itself.

### Commands

```bash
# See which installed packages have newer versions
npm outdated

# Update packages within the allowed semver ranges in package.json
npm update

# Jump to the newest published version (may be a major bump)
npm install chalk@latest --workspace=app
```

### What `Current`, `Wanted`, and `Latest` mean

When you run `npm outdated`, npm prints columns like:

| Column | Meaning |
|--------|---------|
| **Current** | The version installed in `node_modules` right now |
| **Wanted** | The newest version allowed by your `package.json` range |
| **Latest** | The newest version published on the npm registry |

Example with `"chalk": "^4.1.2"`:

- `^4.1.2` allows newer `4.x` versions, but **not** `5.x`
- so **Wanted** might be `4.1.2` (or another 4.x)
- while **Latest** might be `5.x`

That is why Wanted and Latest are often different:

- `npm update` moves you toward **Wanted**
- `npm install package@latest` can move you to **Latest**, even across major versions

### Semver reminder

For a range like `^4.1.2`:

- `4.1.3` is allowed
- `4.9.0` is allowed
- `5.0.0` is **not** allowed by `^`

Major version jumps can include breaking changes, so npm does not auto-update across them unless you ask for `@latest` (or change the range yourself).

---

## Learning exercises

Complete these yourself. Requirements only — no solutions.

1. **Add `divide()`**  
   Add a `divide(a, b)` function to `packages/math-utils/index.js` and export it.

2. **Use `divide()` from app #1**  
   Update `apps/app/index.js` to call `divide(10, 5)` and print the result.

3. **Add `square()`**  
   Add `square(n)` to `math-utils` and use it from `apps/app`.

4. **Create `string-utils`**  
   Create a second package at `packages/string-utils` named `@learning/string-utils` with at least one function (for example `shout(text)` that returns uppercase text).

5. **Consume both packages from an app**  
   Make `apps/app` depend on both `@learning/math-utils` and `@learning/string-utils`, then use both in `index.js`.

6. **Add a test for `add()`**  
   You already have a basic test file. Add another focused assertion for `add()` (or extend coverage for a new function you added).

7. **Add a root script for all package tests**  
   Add an npm script at the root that runs tests for every package workspace.

8. **Run `npm outdated`**  
   From the root, run `npm outdated` and read the `Current` / `Wanted` / `Latest` columns.

9. **Update a dependency**  
   Practice both:
   - `npm update`
   - `npm install <package>@latest --workspace=app`

10. **Run workspaces from the root**  
    From the root, run `app`, `reporter`, and both services using `--workspace=` (not by `cd` into each folder).

11. **Extend pricing-service**  
    Add a `calculateTax(total, rate)` function that uses `math-utils`, then use it from `apps/reporter`.

12. **Create a third service**  
    Add `services/inventory-service` as `@learning/inventory-service`, depend on `math-utils`, and consume it from `apps/reporter`.

13. **Create a third app**  
    Add `apps/admin` that depends on only one service, and add a root script `start:admin`.

---

## Suggested practice loop

Whenever you change a local package:

```bash
# No republish needed for workspace packages.
# Just edit the file and re-run the app:
npm run start:app
```

Whenever you change dependencies:

```bash
npm install
npm outdated
```

---

## Troubleshooting

**`Cannot find module '@learning/math-utils'`**  
Run `npm install` from the **root** (`npm-workspace-learning/`), not from inside `apps/app`.

**Scripts do nothing / wrong package runs**  
Check the `name` field in each workspace `package.json`. `--workspace=app` matches the package name `app`, not necessarily the folder name (though they match here on purpose).

**Tests fail to start**  
Ensure you are on a recent Node.js version. This project uses Node's built-in test runner:

```bash
node --test test.js
```

---

Happy experimenting.
