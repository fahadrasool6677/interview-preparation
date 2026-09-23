# Interview Preparation

Personal workspace for Node.js interview prep: a static study site plus small learning apps for hands-on practice.

## Structure

```text
interview-preparation/
├── nodejs-interview-prep/   # HTML study site (roadmap, 16 phases, assessment)
├── async-learning/          # Callbacks / promises / async practice
├── fs-learning/             # Node fs module practice
├── npm-workspace-learning/  # npm workspaces / monorepo practice
├── test/                    # Express + dotenv sandbox
├── learning.js              # Root scratch: path / fs / globals
├── learningServer.js        # Root scratch: basic http server
├── Q.md                     # Interview question notes
└── node-flow.txt            # Node.js topic outline
```

Each learning folder is independent — open that folder and run its scripts; there is no root `package.json`.

---

## Interview prep site

Static HTML/CSS/JS study hub with 16 phases, assessment, and progress tracking. No `npm install` required.

```bash
cd nodejs-interview-prep
python3 -m http.server 8765 --bind 127.0.0.1
```

Open: [http://127.0.0.1:8765/nodejs-interview-preparation.html](http://127.0.0.1:8765/nodejs-interview-preparation.html)

Use HTTP (not `file://`) so phase links and assets load correctly. Full usage, regenerate steps, and troubleshooting: [`nodejs-interview-prep/README.md`](nodejs-interview-prep/README.md).

---

## Learning apps

### `async-learning`

Practice async patterns (callbacks, promises). ESM (`"type": "module"`).

```bash
cd async-learning
npm run dev              # src/app.js
npm run dev:callbacks    # src/callbacks.js
```

### `fs-learning`

Practice Node `fs` (write, append, callbacks, promises, async/await, exercises). Sample data lives in `data/`.

```bash
cd fs-learning
npm run dev
npm run dev:callbacks
npm run dev:promises
npm run dev:asyncAwait
npm run dev:exercise
```

### `npm-workspace-learning`

Educational monorepo: `apps/`, `services/`, and `packages/` wired with npm workspaces.

```bash
cd npm-workspace-learning
npm install
npm start                # app workspace
npm run start:reporter
npm run start:pricing
npm run start:stats
npm run start:all
npm run test:package     # @learning/math-utils
```

Details: [`npm-workspace-learning/README.md`](npm-workspace-learning/README.md).

### `test`

Express + dotenv sandbox (`express`, `dotenv`). Install deps, then add your own entry file as you experiment.

```bash
cd test
npm install
```

---

## Root scratch files

| File | Purpose |
| --- | --- |
| `learning.js` | Quick experiments with `path`, `fs`, `__dirname` / `__filename` |
| `learningServer.js` | Minimal `http` server on port 3000 |
| `Q.md` | Interview questions and topic checklist |
| `node-flow.txt` | High-level Node.js study outline |

```bash
node learning.js
node learningServer.js
```
