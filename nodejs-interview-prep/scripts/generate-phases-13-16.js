const fs = require("fs");
const path = require("path");
const { phasePage } = require("./shell");

const ROOT = path.resolve(__dirname, "..");
const PHASES_DIR = path.join(ROOT, "phases");

function topic({
  id,
  title,
  priority = "High",
  concept,
  why,
  example,
  exercise,
  mistakes,
  interview,
  answers,
  senior,
  seniorAnswers,
}) {
  return {
    id,
    title,
    priority,
    concept,
    why,
    example,
    mistakes: mistakes || [
      `Explaining ${title} as syntax or tooling without discussing its runtime behavior.`,
      "Ignoring observability, rollback, resource limits, and failure recovery.",
    ],
    interview: interview || [
      `Where does ${title} fit in a production Node.js system?`,
      `What failure mode would make you reconsider your ${title} design?`,
    ],
    answers: answers || [
      `${title} should solve a specific operational or engineering constraint. I would state that constraint, describe the mechanism, and then show how I verify the result in production.`,
      "I would reconsider the design when its failure domain, operating cost, or recovery time no longer meets the service's SLOs.",
    ],
    senior: senior || [
      `How would you operate ${title} safely during a partial outage?`,
      `Which metrics and trade-offs matter most for ${title}?`,
    ],
    seniorAnswers: seniorAnswers || [
      "Prefer bounded retries, explicit timeouts, graceful degradation, and a tested rollback path. Preserve enough telemetry to distinguish application, dependency, and infrastructure failures.",
      "Measure user-visible latency and errors first, then saturation, capacity, cost, and recovery time. Optimize only after identifying the binding constraint.",
    ],
    exercise,
  };
}

function shellExample(code, expected) {
  return { kind: "shell", code, expected };
}

function nodeExample(code, expected) {
  return { kind: "node", code, expected };
}

function textExample(code, expected) {
  return { kind: "text", code, expected };
}

function jsExample(code, expected) {
  return { kind: "js", code, expected };
}

const dockerTopics = [
  topic({
    id: "docker",
    title: "Docker",
    concept: "Docker packages a process and its filesystem dependencies into an image, then runs it with namespace isolation and cgroup resource controls. Containers share the host kernel; they are not lightweight virtual machines.",
    why: "A consistent artifact reduces environment drift from laptop to CI to production. Isolation improves repeatability, but host kernel, storage, networking, and security still require explicit operational design.",
    example: shellExample("docker build -t orders-api:1.4.0 .\ndocker run --rm -p 3000:3000 --memory=512m --cpus=1 orders-api:1.4.0", "The immutable image runs with bounded CPU and memory."),
    exercise: "Containerize a small Node.js API, apply CPU and memory limits, then observe its behavior under load and on SIGTERM.",
  }),
  topic({
    id: "dockerfile",
    title: "Dockerfile",
    concept: "A Dockerfile is an ordered build recipe. Each filesystem-changing instruction creates a cacheable layer, while ENTRYPOINT and CMD define the runtime process.",
    why: "Instruction order controls cache reuse and rebuild speed. Exec-form commands deliver signals correctly, which is essential for graceful Node.js shutdown.",
    example: textExample("FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nUSER node\nEXPOSE 3000\nCMD [\"node\", \"server.js\"]"),
    mistakes: ["Copying the whole repository before npm ci, invalidating dependency cache.", "Using a shell-form CMD or running the service as root."],
    exercise: "Write a Dockerfile that caches dependency installation, runs as a non-root user, and responds correctly to SIGTERM.",
  }),
  topic({
    id: "docker-compose",
    title: "Docker Compose",
    concept: "Compose declares a multi-container development or single-host stack: services, networks, volumes, environment, health checks, and dependency relationships.",
    why: "It makes local infrastructure reproducible, but depends_on only orders startup unless health conditions are configured; the application must still retry unavailable dependencies.",
    example: textExample("services:\n  api:\n    build: .\n    ports: [\"3000:3000\"]\n    depends_on:\n      postgres:\n        condition: service_healthy\n  postgres:\n    image: postgres:17-alpine\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -U postgres\"]\n      interval: 5s\n      timeout: 3s\n      retries: 10"),
    exercise: "Create a Compose stack for an API, Postgres, and Redis with health checks and no hard-coded credentials.",
  }),
  topic({
    id: "images",
    title: "Images",
    concept: "An image is a content-addressed, immutable manifest of read-only layers plus runtime metadata. Tags are mutable references; digests identify exact content.",
    why: "Layer reuse saves transfer and storage, while digest pinning makes a deployment reproducible and auditable.",
    example: shellExample("docker pull node:22-alpine\ndocker image inspect node:22-alpine --format '{{index .RepoDigests 0}}'\ndocker history node:22-alpine", "Inspect the pinned digest and image layers."),
    exercise: "Compare two image versions by digest, size, package inventory, and vulnerability report.",
  }),
  topic({
    id: "containers",
    title: "Containers",
    concept: "A container is a running image plus a writable layer and runtime configuration. Its lifecycle should be disposable; durable state belongs outside it.",
    why: "Schedulers replace failed instances rather than repairing them. Stateless processes enable horizontal scaling and predictable recovery.",
    example: shellExample("docker run -d --name api --restart=on-failure:3 orders-api:1.4.0\ndocker inspect api --format '{{.State.Status}} {{.State.Health.Status}}'\ndocker stop --time 20 api"),
    exercise: "Implement graceful shutdown in a Node process and prove that an in-flight request completes before the container exits.",
  }),
  topic({
    id: "volumes",
    title: "Volumes",
    concept: "Volumes persist data independently of a container writable layer. Named volumes are managed by Docker; bind mounts expose host paths directly.",
    why: "Container layers are ephemeral and inefficient for durable, write-heavy state. Volume ownership, backup, restore, and cross-host movement remain operator responsibilities.",
    example: shellExample("docker volume create pgdata\ndocker run --rm -v pgdata:/var/lib/postgresql/data postgres:17-alpine\ndocker volume inspect pgdata"),
    exercise: "Persist a database in a named volume, destroy the container, restore from backup, and verify data integrity.",
  }),
  topic({
    id: "networks",
    title: "Networks",
    concept: "User-defined bridge networks provide service-name DNS and isolated connectivity. Publishing a port exposes it through the host; EXPOSE alone is documentation.",
    why: "Separating internal dependency traffic from public ingress reduces attack surface and clarifies trust boundaries.",
    example: shellExample("docker network create backend\ndocker run -d --network backend --name redis redis:7-alpine\ndocker run --rm --network backend redis:7-alpine redis-cli -h redis ping", "PONG"),
    exercise: "Design public and private networks so only the reverse proxy is host-accessible and the database is private.",
  }),
  topic({
    id: "environment-variables",
    title: "Environment variables",
    concept: "Environment variables inject runtime configuration into an otherwise immutable artifact. Validate them at startup and distinguish configuration from secrets.",
    why: "Build-once/deploy-many avoids environment-specific images. Missing or malformed values should fail fast before the instance receives traffic.",
    example: nodeExample("const required = ['DATABASE_URL', 'PORT'];\nfor (const key of required) {\n  if (!process.env[key]) throw new Error('Missing ' + key);\n}\nconst port = Number(process.env.PORT);\nif (!Number.isInteger(port)) throw new Error('PORT must be an integer');"),
    mistakes: ["Baking secrets into image layers or committing .env files.", "Logging the full environment or silently accepting invalid defaults."],
    exercise: "Add a typed startup configuration module that redacts secrets and reports actionable validation errors.",
  }),
  topic({
    id: "multi-stage-builds",
    title: "Multi-stage builds",
    concept: "Multi-stage builds use separate build and runtime stages so compilers, source maps, test tools, and development dependencies need not ship in the final image.",
    why: "A smaller runtime image transfers faster and has less attack surface, while build reproducibility remains in the Dockerfile.",
    example: textExample("FROM node:22-alpine AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:22-alpine AS runtime\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev && npm cache clean --force\nCOPY --from=build /app/dist ./dist\nUSER node\nCMD [\"node\", \"dist/server.js\"]"),
    exercise: "Convert a TypeScript service to a multi-stage build and compare image size and installed packages.",
  }),
  topic({
    id: "production-deployment",
    title: "Production deployment",
    concept: "A production deployment promotes a versioned artifact through environments with readiness checks, controlled rollout, telemetry, and rollback.",
    why: "Deployments change both code and system behavior. Canary or rolling strategies limit blast radius, but only if health signals represent user-visible correctness.",
    example: textExample("release: orders-api@1.4.0 (image digest pinned)\nstrategy: 10% canary -> 50% -> 100%\ngates: readiness, p95 latency, 5xx rate, queue lag\nrollback: automatic on SLO breach"),
    exercise: "Write a deployment runbook with preflight checks, migration ordering, canary gates, rollback, and incident ownership.",
  }),
  topic({
    id: "pm2",
    title: "PM2",
    concept: "PM2 supervises Node.js processes, supports restart policies, logs, graceful reload, and cluster mode. Under a container orchestrator, process supervision is often delegated to the platform.",
    why: "On a VM, PM2 can improve availability and use multiple cores. In containers, one process per container usually gives clearer lifecycle and scaling semantics.",
    example: textExample("module.exports = {\n  apps: [{\n    name: 'api',\n    script: 'dist/server.js',\n    instances: 'max',\n    exec_mode: 'cluster',\n    kill_timeout: 15000,\n    max_memory_restart: '500M'\n  }]\n};"),
    exercise: "Compare PM2 cluster mode on a VM with multiple orchestrated containers, including logs, restarts, scaling, and failure domains.",
  }),
  topic({
    id: "reverse-proxy",
    title: "Reverse proxy",
    concept: "A reverse proxy terminates client connections and forwards requests to upstream services, often adding TLS, routing, buffering, compression, and rate limits.",
    why: "Central ingress policy simplifies applications, but incorrect timeout and buffering settings can break streaming, WebSockets, uploads, and cancellation.",
    example: textExample("client -> reverse proxy -> Node API\n                     -> static assets\n                     -> authentication service\nForward: Host, X-Request-ID, X-Forwarded-For, X-Forwarded-Proto"),
    exercise: "Specify proxy timeouts for normal APIs, streaming responses, uploads, and WebSockets, and explain each difference.",
  }),
  topic({
    id: "nginx",
    title: "Nginx",
    concept: "Nginx is an event-driven web server and reverse proxy commonly used for TLS termination, static files, routing, caching, and load balancing.",
    why: "It handles large numbers of mostly idle connections efficiently and shields application instances, but config must preserve client identity and request semantics.",
    example: textExample("upstream api { server api:3000; keepalive 32; }\nserver {\n  listen 80;\n  location /api/ {\n    proxy_pass http://api;\n    proxy_http_version 1.1;\n    proxy_set_header Host $host;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    proxy_set_header X-Request-ID $request_id;\n  }\n}"),
    exercise: "Configure Nginx for a Node API with upstream keep-alive, request IDs, body limits, and a health endpoint.",
  }),
  topic({
    id: "https",
    title: "HTTPS",
    concept: "HTTPS is HTTP over TLS, providing server authentication, confidentiality, and integrity. Certificates bind names to public keys and require renewal.",
    why: "TLS prevents passive reading and active modification in transit. Correct termination, redirect, HSTS, modern protocols, and internal trust boundaries all matter.",
    example: shellExample("curl -I https://api.example.com/health\nopenssl s_client -connect api.example.com:443 -servername api.example.com </dev/null", "Inspect certificate chain, negotiated protocol, and security headers."),
    exercise: "Create a certificate renewal and expiry-alert plan; explain TLS termination at the edge versus end-to-end TLS.",
  }),
  topic({
    id: "ci-cd",
    title: "CI/CD",
    concept: "Continuous integration validates each change; continuous delivery produces a releasable artifact; continuous deployment promotes passing changes automatically.",
    why: "Automated, repeatable gates shorten feedback and reduce manual drift. Security scans and tests help, but deployment safety also needs staged rollout and production signals.",
    example: textExample("on commit:\n  lint -> unit -> integration -> build image -> scan -> sign\non approved release:\n  deploy canary -> smoke test -> observe SLO -> promote/rollback"),
    exercise: "Design a pipeline that builds once, pins the digest, signs provenance, gates database migrations, and rolls back safely.",
  }),
  topic({
    id: "basic-cloud-architecture",
    title: "Basic cloud architecture",
    concept: "A typical cloud service places DNS and CDN/WAF before a load balancer, runs stateless application instances across failure zones, and uses managed data, queue, cache, and object storage services.",
    why: "Managed primitives reduce undifferentiated operations, while multi-zone placement and asynchronous boundaries improve resilience. Every dependency still needs explicit timeout, retry, capacity, and cost design.",
    example: textExample("DNS -> CDN/WAF -> Load Balancer -> Node instances (multi-AZ)\n                                  |-> Redis\n                                  |-> Queue -> workers\n                                  |-> Managed Postgres\n                                  |-> Object storage\nTelemetry -> logs, metrics, traces, alerts"),
    exercise: "Draw a cloud architecture for an order API and identify trust boundaries, failure domains, data ownership, and scaling bottlenecks.",
  }),
];

const testingTopics = [
  topic({
    id: "unit-testing",
    title: "Unit testing",
    concept: "Unit tests exercise a small behavior through a stable public interface with fast, deterministic collaborators.",
    why: "They localize failures and support refactoring when they assert outcomes rather than implementation details.",
    example: nodeExample("function total(items) {\n  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);\n}\ntest('calculates an order total', () => {\n  expect(total([{ price: 12, quantity: 2 }])).toBe(24);\n});"),
    exercise: "Unit-test a pricing policy using boundary values, invalid data, and table-driven cases without testing private functions.",
  }),
  topic({
    id: "integration-testing",
    title: "Integration testing",
    concept: "Integration tests verify contracts across real boundaries such as application-to-database, queue, filesystem, or HTTP adapter.",
    why: "Many production defects live in serialization, schema, transaction, and configuration boundaries that mocks cannot faithfully reproduce.",
    example: nodeExample("beforeAll(async () => db.migrate.latest());\nafterEach(async () => db('orders').truncate());\ntest('persists an order atomically', async () => {\n  const order = await repository.create({ customerId: 'c1', total: 42 });\n  expect(await db('orders').where({ id: order.id }).first()).toMatchObject({ total: 42 });\n});"),
    exercise: "Use an isolated real database to test a transaction rollback and a uniqueness conflict.",
  }),
  topic({
    id: "end-to-end-testing",
    title: "End-to-end testing",
    concept: "End-to-end tests exercise a critical user flow through deployed system boundaries, from public interface to durable effects.",
    why: "They provide high confidence in wiring and contracts but are slower and harder to diagnose, so keep the suite focused on high-value journeys.",
    example: textExample("Arrange: create a customer and inventory\nAct: POST /orders with an idempotency key\nAssert: 201 response, persisted order, inventory reservation, emitted event\nCleanup: delete test-owned data"),
    exercise: "Design three E2E tests for checkout that maximize risk coverage without duplicating lower-level tests.",
  }),
  topic({
    id: "jest",
    title: "Jest",
    concept: "Jest provides test discovery, assertions, spies, mocks, fake timers, coverage, and worker isolation for JavaScript and TypeScript projects.",
    why: "A coherent runner shortens feedback, but global state, leaked handles, module mocking, and parallel execution can create false confidence or flaky tests.",
    example: nodeExample("afterEach(() => {\n  jest.restoreAllMocks();\n  jest.useRealTimers();\n});\ntest('expires cached data', () => {\n  jest.useFakeTimers();\n  const cache = createCache({ ttlMs: 1000 });\n  cache.set('x', 1);\n  jest.advanceTimersByTime(1001);\n  expect(cache.get('x')).toBeUndefined();\n});"),
    exercise: "Configure separate Jest unit and integration projects with appropriate timeouts, setup, and worker counts.",
  }),
  topic({
    id: "mocking",
    title: "Mocking",
    concept: "Mocking replaces a collaborator and can control responses or verify interactions. Mock at architectural seams, not arbitrary internal calls.",
    why: "Mocks make rare failures deterministic, but they can drift from real contracts and couple tests to implementation.",
    example: nodeExample("const paymentGateway = { charge: jest.fn().mockResolvedValue({ id: 'p1' }) };\nconst service = new CheckoutService({ paymentGateway });\nawait service.checkout(order);\nexpect(paymentGateway.charge).toHaveBeenCalledWith({ amount: order.total, idempotencyKey: order.id });"),
    exercise: "Test payment timeout handling with a mock, then add a contract test that proves the real adapter matches the mock's shape.",
  }),
  topic({
    id: "test-doubles",
    title: "Test doubles",
    concept: "A dummy fills an unused parameter, a stub returns canned data, a spy records calls, a mock encodes interaction expectations, and a fake provides a working simplified implementation.",
    why: "Naming the double clarifies the test's purpose and warns about fidelity. An in-memory fake is useful but may not reproduce database constraints or concurrency.",
    example: textExample("dummy: unused logger\nstub: clock.now() returns a fixed instant\nspy: records email sends\nmock: expects one payment charge\nfake: in-memory repository implementing Repository"),
    exercise: "Implement one example of each test double for an order service and state the risk each introduces.",
  }),
  topic({
    id: "api-testing",
    title: "API testing",
    concept: "API tests validate status, headers, body schema, authentication, idempotency, pagination, validation, and error contracts through the HTTP boundary.",
    why: "Clients depend on protocol behavior, not controller internals. Contract-focused tests detect accidental breaking changes.",
    example: nodeExample("const response = await request(app)\n  .post('/orders')\n  .set('Idempotency-Key', 'test-key-1')\n  .send({ sku: 'A1', quantity: 2 });\nexpect(response.status).toBe(201);\nexpect(response.headers.location).toMatch(/^\\/orders\\//);\nexpect(response.body).toMatchObject({ status: 'pending' });"),
    exercise: "Test an API's malformed JSON, validation, auth, conflict, rate-limit, and idempotent replay behavior.",
  }),
  topic({
    id: "database-testing",
    title: "Database testing",
    concept: "Database tests verify migrations, constraints, queries, transactions, isolation, indexes, and repository mappings against the actual database engine.",
    why: "In-memory substitutes differ in SQL semantics, locking, and query planning. Isolation strategies must keep parallel tests deterministic.",
    example: textExample("per test suite:\n  start isolated database/container\n  apply production migrations\nper test:\n  begin transaction or truncate owned tables\nassert:\n  constraints, rollback, query results, execution plan where critical"),
    exercise: "Prove that two concurrent inventory reservations cannot oversell and inspect the locking behavior.",
  }),
  topic({
    id: "test-coverage",
    title: "Test coverage",
    concept: "Coverage measures executed statements, branches, functions, and lines; mutation testing measures whether tests detect behavioral changes.",
    why: "Coverage finds unexercised code but cannot prove meaningful assertions. Branch risk and mutation survival are stronger guides than a single percentage target.",
    example: shellExample("npx jest --coverage\nnpx stryker run", "Review uncovered branches and surviving mutants, not only the headline percentage."),
    exercise: "Raise confidence in a low-coverage authorization module by targeting risky branches, then compare coverage with mutation results.",
  }),
  topic({
    id: "testing-asynchronous-code",
    title: "Testing asynchronous code",
    concept: "Async tests must return or await the promise, control time explicitly, and observe eventual effects without arbitrary sleeps.",
    why: "Unawaited work creates false positives and open handles. Polling with a deadline or fake timers makes eventual behavior deterministic.",
    example: nodeExample("test('retries once after a transient error', async () => {\n  const operation = jest.fn()\n    .mockRejectedValueOnce(new Error('temporary'))\n    .mockResolvedValue('ok');\n  await expect(retry(operation, { attempts: 2, delayMs: 0 })).resolves.toBe('ok');\n  expect(operation).toHaveBeenCalledTimes(2);\n});"),
    exercise: "Test cancellation, timeout, retry exhaustion, and an event emitted after a transaction commits.",
  }),
  topic({
    id: "mock-boundaries",
    title: "What should and should not be mocked",
    concept: "Mock nondeterministic or expensive external boundaries when testing application policy: payment providers, clocks, random IDs, email, and remote APIs. Do not mock the code under test, plain value objects, or database behavior in tests intended to validate SQL.",
    why: "The goal is deterministic tests without inventing a parallel implementation of reality. Use real local infrastructure for contracts and mocks for controlled application-level scenarios.",
    example: textExample("Usually mock: remote payment API, email gateway, clock, UUID source\nUsually real: domain functions, serializers, repository SQL in integration tests\nUse both: mock remote adapter in service tests + provider contract/sandbox tests"),
    mistakes: ["Mocking every dependency until the test only verifies mock wiring.", "Calling real third-party services from the fast unit suite.", "Using an in-memory fake as proof that production SQL and locking work."],
    exercise: "Draw the test boundaries for an order service and justify every real dependency, fake, stub, and mock.",
  }),
];

const dsaData = [
  ["arrays", "Arrays", "Contiguous indexed storage gives O(1) access; backend problems often model event batches, intervals, and capacity timelines.", "Track a running balance across sorted capacity deltas.", "const changes = [[1, 3], [4, -1], [6, -2]];\nlet active = 0, peak = 0;\nfor (const [, delta] of changes) { active += delta; peak = Math.max(peak, active); }\nconsole.log(peak);", "3"],
  ["strings", "Strings", "JavaScript strings are immutable UTF-16 sequences; parsing protocols requires clear normalization and Unicode assumptions.", "Canonicalize an HTTP header token without accidentally changing its value.", "const value = '  GZip, BR, gzip ';\nconst tokens = [...new Set(value.split(',').map(x => x.trim().toLowerCase()))];\nconsole.log(tokens.join(','));", "gzip,br"],
  ["hash-maps", "Hash maps", "Map provides expected O(1) lookup and preserves arbitrary key types; it is the default index for deduplication, joins, and counters.", "Aggregate request counts by tenant in one pass.", "const tenants = ['a', 'b', 'a', 'c', 'a', 'b'];\nconst counts = new Map();\nfor (const id of tenants) counts.set(id, (counts.get(id) || 0) + 1);\nconsole.log(JSON.stringify(Object.fromEntries(counts)));", "{\"a\":3,\"b\":2,\"c\":1}"],
  ["stacks", "Stacks", "A LIFO stack models nested structure, rollback order, and monotonic candidate sets.", "Validate nested delimiters in a configuration expression.", "const input = '([{}])';\nconst pairs = { ')': '(', ']': '[', '}': '{' };\nconst stack = [];\nlet valid = true;\nfor (const ch of input) {\n  if ('([{'.includes(ch)) stack.push(ch);\n  else if (stack.pop() !== pairs[ch]) { valid = false; break; }\n}\nconsole.log(valid && stack.length === 0);", "true"],
  ["queues", "Queues", "FIFO ordering models work dispatch and breadth-first traversal; efficient implementations avoid Array.shift's repeated reindexing.", "Drain a work queue using a head index.", "const queue = ['job-1', 'job-2', 'job-3'];\nlet head = 0;\nwhile (head < queue.length) console.log('processing ' + queue[head++]);", "processing job-1\nprocessing job-2\nprocessing job-3"],
  ["linked-lists", "Linked lists", "Linked nodes provide O(1) insertion/removal when a node is known and are commonly paired with a map for an LRU cache.", "Move an accessed cache node to the front without scanning.", "const a = { value: 'a' }, b = { value: 'b' }, c = { value: 'c' };\na.next = b; b.next = c;\nlet slow = a, fast = a;\nwhile (fast && fast.next) { slow = slow.next; fast = fast.next.next; }\nconsole.log(slow.value);", "b"],
  ["trees", "Trees", "Trees represent hierarchy and ordered indexes. Traversal choice controls whether processing is depth-first, breadth-first, or sorted.", "Compute the maximum depth of a routing tree.", "const root = { name: '/', children: [{ name: 'api', children: [{ name: 'v1', children: [] }] }, { name: 'health', children: [] }] };\nfunction depth(node) { return 1 + Math.max(0, ...node.children.map(depth)); }\nconsole.log(depth(root));", "3"],
  ["graphs", "Graphs", "Graphs model dependencies, services, and workflows. Adjacency lists are space-efficient; visited state prevents cycles.", "Topologically order migration dependencies and detect a cycle.", "const graph = new Map([['schema', ['seed']], ['seed', ['index']], ['index', []]]);\nconst seen = new Set(), order = [];\nfunction visit(node) { if (seen.has(node)) return; seen.add(node); for (const next of graph.get(node)) visit(next); order.push(node); }\nvisit('schema');\nconsole.log(order.reverse().join(' -> '));", "schema -> seed -> index"],
  ["recursion", "Recursion", "Recursion decomposes a problem into smaller instances but consumes call stack; iterative traversal is safer for unbounded user-controlled depth.", "Flatten a bounded nested configuration object.", "function flatten(value, prefix = '', out = {}) {\n  for (const [key, item] of Object.entries(value)) {\n    const path = prefix ? prefix + '.' + key : key;\n    if (item && typeof item === 'object') flatten(item, path, out); else out[path] = item;\n  }\n  return out;\n}\nconsole.log(JSON.stringify(flatten({ db: { host: 'localhost', port: 5432 } })));", "{\"db.host\":\"localhost\",\"db.port\":5432}"],
  ["sorting", "Sorting", "Comparison sorting is generally O(n log n); stable ordering and comparator correctness matter for pagination and deterministic output.", "Sort jobs by priority then creation sequence.", "const jobs = [{ id: 'b', p: 1, seq: 2 }, { id: 'a', p: 2, seq: 1 }, { id: 'c', p: 1, seq: 1 }];\njobs.sort((x, y) => y.p - x.p || x.seq - y.seq);\nconsole.log(jobs.map(x => x.id).join(','));", "a,c,b"],
  ["searching", "Searching", "Search strategy follows structure: linear scan for unsorted data, indexed lookup for keys, and graph traversal for relationships.", "Use BFS to find the shortest service dependency path.", "const graph = { api: ['auth', 'orders'], orders: ['db'], auth: ['db'], db: [] };\nconst q = [['api']], seen = new Set(['api']);\nwhile (q.length) { const path = q.shift(), node = path.at(-1); if (node === 'db') { console.log(path.join(' -> ')); break; } for (const n of graph[node]) if (!seen.has(n)) { seen.add(n); q.push([...path, n]); } }", "api -> auth -> db"],
  ["sliding-window", "Sliding window", "A window maintains an aggregate over a contiguous range, reducing repeated work from O(nk) to O(n).", "Find the maximum requests observed in any three consecutive buckets.", "const buckets = [2, 8, 1, 5, 7, 3];\nconst k = 3;\nlet sum = buckets.slice(0, k).reduce((a, b) => a + b, 0), best = sum;\nfor (let i = k; i < buckets.length; i++) { sum += buckets[i] - buckets[i - k]; best = Math.max(best, sum); }\nconsole.log(best);", "15"],
  ["two-pointers", "Two pointers", "Two indices moving under a monotonic condition can replace a nested search in sorted or partitioned data.", "Find two sorted latency samples whose sum hits a budget.", "const values = [10, 20, 35, 50, 75];\nconst target = 85;\nlet left = 0, right = values.length - 1;\nwhile (left < right) { const sum = values[left] + values[right]; if (sum === target) break; sum < target ? left++ : right--; }\nconsole.log(values[left] + ',' + values[right]);", "10,75"],
  ["binary-search", "Binary search", "Binary search halves an ordered search space and also finds the first feasible answer when a predicate is monotonic.", "Find the minimum worker capacity that can process jobs within three batches.", "const jobs = [7, 2, 5, 10, 8], batches = 3;\nfunction fits(cap) { let used = 1, load = 0; for (const job of jobs) { if (load + job > cap) { used++; load = 0; } load += job; } return used <= batches; }\nlet lo = Math.max(...jobs), hi = jobs.reduce((a, b) => a + b, 0);\nwhile (lo < hi) { const mid = Math.floor((lo + hi) / 2); fits(mid) ? hi = mid : lo = mid + 1; }\nconsole.log(lo);", "14"],
  ["dynamic-programming", "Dynamic programming", "Dynamic programming caches overlapping subproblems. State definition, transition, base case, and iteration order are more important than memorizing templates.", "Find minimum retry cost to reach a target using allowed operation costs.", "const cost = [10, 15, 20, 5];\nlet prev2 = 0, prev1 = 0;\nfor (const current of cost) { const next = current + Math.min(prev1, prev2); prev2 = prev1; prev1 = next; }\nconsole.log(Math.min(prev1, prev2));", "20"],
];

const dsaTopics = dsaData.map(([id, title, concept, problem, code, expected]) =>
  topic({
    id,
    title,
    priority: id === "dynamic-programming" || id === "graphs" || id === "binary-search" ? "High" : "Medium",
    concept,
    why: `${problem} State the invariant first, then derive time and space complexity and test boundary cases.`,
    example: jsExample(code, expected),
    mistakes: ["Choosing a memorized pattern before proving its invariant.", "Ignoring input scale, mutation, Unicode/numeric limits, or worst-case complexity."],
    interview: [`Solve a backend-flavored ${title.toLowerCase()} problem and explain the invariant.`, "How would input scale or streaming data change the solution?"],
    answers: [`I would start with a correct baseline, identify repeated work, then select the data structure that preserves the required invariant.`, "For unbounded input I would avoid retaining the full dataset, use bounded state where possible, and define approximation or spill-to-disk behavior explicitly."],
    exercise: `${problem} Extend the example with empty, single-item, duplicate, and large-input test cases.`,
  }),
);

const practicalTopics = [
  ["debounce", "Implement debounce", "Debounce delays execution until calls have stopped for a period; useful for coalescing bursts, not for guaranteed durable work.", "function debounce(fn, wait) {\n  let timer;\n  return function (...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), wait);\n  };\n}\nreturn new Promise(resolve => {\n  const save = debounce(value => { console.log(value); resolve(); }, 20);\n  save('draft-1'); save('draft-2'); save('final');\n});", "final"],
  ["throttle", "Implement throttle", "Throttle permits at most one execution per interval. Leading/trailing semantics must be explicit.", "function throttle(fn, wait) {\n  let last = -Infinity;\n  return function (...args) {\n    const now = Date.now();\n    if (now - last >= wait) { last = now; return fn.apply(this, args); }\n  };\n}\nconst emit = throttle(value => console.log(value), 1000);\nemit('accepted'); emit('dropped');", "accepted"],
  ["retry", "Implement retry", "Retry only transient failures, with bounded attempts, backoff, jitter, timeout, and cancellation; preserve idempotency.", "async function retry(fn, { attempts = 3, delayMs = 10 } = {}) {\n  let error;\n  for (let i = 0; i < attempts; i++) {\n    try { return await fn(i); } catch (e) { error = e; if (i + 1 < attempts) await new Promise(r => setTimeout(r, delayMs * 2 ** i)); }\n  }\n  throw error;\n}\nlet calls = 0;\nreturn retry(() => ++calls < 3 ? Promise.reject(new Error('temporary')) : Promise.resolve('ok')).then(value => console.log(value + ' after ' + calls));", "ok after 3"],
  ["concurrency-limiter", "Implement concurrency limiter", "A limiter bounds in-flight asynchronous work, protecting memory and downstream capacity while preserving queued jobs.", "function createLimiter(limit) {\n  let active = 0; const queue = [];\n  const drain = () => {\n    while (active < limit && queue.length) {\n      active++; const { task, resolve, reject } = queue.shift();\n      Promise.resolve().then(task).then(resolve, reject).finally(() => { active--; drain(); });\n    }\n  };\n  return task => new Promise((resolve, reject) => { queue.push({ task, resolve, reject }); drain(); });\n}\nconst limit = createLimiter(2);\nreturn Promise.all([1, 2, 3, 4].map(n => limit(async () => n * n))).then(x => console.log(x.join(',')));", "1,4,9,16"],
  ["promise-all", "Implement Promise.all", "Promise.all preserves input order, resolves after all values, and rejects on the first observed rejection while remaining work continues.", "function promiseAll(values) {\n  return new Promise((resolve, reject) => {\n    const items = Array.from(values), results = new Array(items.length);\n    if (items.length === 0) return resolve([]);\n    let remaining = items.length;\n    items.forEach((value, i) => Promise.resolve(value).then(result => {\n      results[i] = result;\n      if (--remaining === 0) resolve(results);\n    }, reject));\n  });\n}\nreturn promiseAll([Promise.resolve('a'), 'b', new Promise(r => setTimeout(() => r('c'), 10))]).then(x => console.log(x.join(',')));", "a,b,c"],
  ["cache", "Implement cache", "A cache trades freshness and memory for latency and dependency load. TTL, capacity, key correctness, stampede protection, and invalidation are core semantics.", "function createCache(ttlMs) {\n  const data = new Map();\n  return {\n    set(key, value) { data.set(key, { value, expires: Date.now() + ttlMs }); },\n    get(key) { const item = data.get(key); if (!item || item.expires <= Date.now()) { data.delete(key); return undefined; } return item.value; },\n    delete(key) { return data.delete(key); }\n  };\n}\nconst cache = createCache(1000); cache.set('user:1', { name: 'Ayan' }); console.log(cache.get('user:1').name);", "Ayan"],
  ["event-emitter", "Implement event emitter", "An event emitter decouples in-process publishers and subscribers. Listener lifecycle, errors, ordering, and reentrancy need defined behavior.", "class EventEmitter {\n  #events = new Map();\n  on(name, fn) { const set = this.#events.get(name) || new Set(); set.add(fn); this.#events.set(name, set); return () => this.off(name, fn); }\n  off(name, fn) { this.#events.get(name)?.delete(fn); }\n  emit(name, ...args) { for (const fn of [...(this.#events.get(name) || [])]) fn(...args); }\n}\nconst bus = new EventEmitter(); const unsubscribe = bus.on('order.created', id => console.log(id)); bus.emit('order.created', 'o-1'); unsubscribe();", "o-1"],
  ["rate-limiter", "Implement rate limiter", "A token bucket allows bursts up to capacity and refills at a steady rate. Distributed enforcement requires atomic shared state and a policy for clock and partition behavior.", "function tokenBucket({ capacity, refillPerSecond }) {\n  let tokens = capacity, updated = Date.now();\n  return () => {\n    const now = Date.now();\n    tokens = Math.min(capacity, tokens + (now - updated) / 1000 * refillPerSecond); updated = now;\n    if (tokens < 1) return false;\n    tokens -= 1; return true;\n  };\n}\nconst allow = tokenBucket({ capacity: 2, refillPerSecond: 1 });\nconsole.log([allow(), allow(), allow()].join(','));", "true,true,false"],
  ["queue", "Implement queue", "A queue should provide amortized O(1) enqueue/dequeue without Array.shift. Production queues additionally need durability, acknowledgement, visibility timeout, and dead-letter handling.", "class Queue {\n  #items = []; #head = 0;\n  enqueue(value) { this.#items.push(value); }\n  dequeue() { if (this.#head >= this.#items.length) return undefined; const value = this.#items[this.#head++]; if (this.#head > 64 && this.#head * 2 > this.#items.length) { this.#items = this.#items.slice(this.#head); this.#head = 0; } return value; }\n  get size() { return this.#items.length - this.#head; }\n}\nconst q = new Queue(); q.enqueue('a'); q.enqueue('b'); console.log(q.dequeue() + ',' + q.dequeue() + ',' + q.size);", "a,b,0"],
  ["deep-clone", "Implement deep clone", "Deep cloning is type- and policy-dependent. structuredClone handles cycles and many built-ins but not functions or every host object; JSON serialization is not a general clone.", "const source = { date: new Date('2026-01-01T00:00:00Z'), map: new Map([['x', 1]]) };\nsource.self = source;\nconst copy = structuredClone(source);\nconsole.log(copy !== source, copy.self === copy, copy.date instanceof Date, copy.map.get('x'));", "true true true 1"],
].map(([id, title, concept, code, expected]) =>
  topic({
    id: `implement-${id}`,
    title,
    priority: "High",
    concept,
    why: "A senior implementation defines behavior at boundary cases, analyzes complexity, and makes cancellation, errors, ordering, and resource ownership explicit.",
    example: jsExample(code, expected),
    mistakes: ["Implementing only the happy path shown in a familiar snippet.", "Leaving timing, errors, cleanup, ordering, or memory growth unspecified."],
    interview: [`Implement ${title.replace("Implement ", "")} and narrate the invariants.`, "Which production requirements would change this implementation?"],
    answers: ["I would first define the observable contract and edge cases, then implement the smallest state machine that preserves that contract.", "Distributed state, cancellation, persistence, fairness, and observability usually turn the interview utility into a different production component."],
    exercise: `Add focused tests for ${title.replace("Implement ", "").toLowerCase()}, including errors, empty input, cleanup, and concurrent or timing-sensitive behavior.`,
  }),
);

const projects = [
  {
    id: "production-rest-api",
    title: "Production-style REST API",
    intro: "Build a versioned TypeScript API whose quality is visible through contracts, operations, and failure handling—not only CRUD endpoints.",
    requirements: ["CRUD plus filtering, cursor pagination, idempotent writes, validation, and consistent errors.", "OpenAPI contract, request IDs, structured logs, metrics, traces, health and readiness endpoints."],
    architecture: ["Layer HTTP adapters, application use cases, domain policy, and infrastructure adapters.", "Use dependency injection at composition roots; define timeout and transaction boundaries explicitly."],
    database: ["Postgres migrations, constraints, indexes, optimistic concurrency, and transaction-safe writes.", "Explain query plans and pagination stability."],
    apis: ["POST /v1/resources with Idempotency-Key; GET collection with opaque cursor.", "PATCH with version precondition; standard problem-details errors."],
    security: ["Authentication, object-level authorization, schema validation, rate limits, secure headers, secret management.", "Threat model injection, mass assignment, data exposure, and abuse."],
    testing: ["Unit-test domain policy, integrate against real Postgres, contract-test HTTP, and E2E critical flow.", "Include concurrency, migration, and failure-path tests."],
    performance: ["Profile p95/p99 latency, bound request bodies and query work, pool database connections.", "Cache only measured read bottlenecks with explicit invalidation."],
    scaling: ["Run stateless instances behind a load balancer; move slow work to durable workers.", "Partition by tenant only after measuring contention."],
    failures: ["Graceful shutdown, dependency timeouts, bounded retries, circuit breaking, rollback, and degraded responses.", "Run a database outage and slow-dependency game day."],
  },
  {
    id: "authentication-system",
    title: "Authentication system",
    intro: "Implement secure session and token lifecycles, authorization boundaries, and auditable account recovery.",
    requirements: ["Registration, verification, login, logout, password reset, session management, MFA-ready design.", "Account lockout and suspicious-login audit trail without enabling denial-of-service abuse."],
    architecture: ["Separate identity proof, credential storage, session issuance, and authorization policy.", "Use a dedicated notification adapter and outbox for security emails."],
    database: ["Users, normalized identities, Argon2id password hashes, hashed reset tokens, sessions, audit events.", "Unique constraints and transactional token consumption."],
    apis: ["POST /auth/login, /logout, /refresh, /forgot-password, /reset-password.", "GET/DELETE active sessions; avoid leaking whether an account exists."],
    security: ["HttpOnly Secure SameSite cookies or carefully scoped tokens; rotation and reuse detection.", "CSRF defense, rate limits, constant-shaped responses, key rotation, short-lived credentials."],
    testing: ["Test expiry, replay, fixation, revocation, concurrent refresh, enumeration resistance, and authorization.", "Use a controllable clock and real database constraints."],
    performance: ["Bound password-hash cost and login concurrency; index active sessions.", "Cache authorization cautiously and preserve revocation semantics."],
    scaling: ["Shared durable session state or independently verifiable access tokens plus centralized refresh state.", "Rotate signing keys through a published key set."],
    failures: ["Fail closed for authorization, preserve logout/revocation, and queue noncritical email.", "Handle key compromise and credential-stuffing incident response."],
  },
  {
    id: "order-processing-system",
    title: "Order processing system",
    intro: "Design an order workflow that remains correct across payment, inventory, and delivery failures.",
    requirements: ["Create order, reserve inventory, authorize payment, confirm or compensate, expose status history.", "Idempotent commands and at-least-once event consumption."],
    architecture: ["Model an explicit state machine and saga; avoid distributed transactions across services.", "Use transactional outbox/inbox and durable workers."],
    database: ["Orders, line items, state transitions, idempotency records, outbox, inventory reservations.", "Constraints enforce legal uniqueness; transactions atomically update state and outbox."],
    apis: ["POST /orders with idempotency key; GET /orders/:id; POST cancellation.", "Webhook/callback endpoints authenticate sources and deduplicate events."],
    security: ["Authorize order ownership, tokenize payment data, minimize PCI scope, redact sensitive logs.", "Sign internal messages where trust boundaries require it."],
    testing: ["State-machine and property tests; integration tests for outbox; E2E happy and compensation paths.", "Inject duplicate, reordered, delayed, and poison messages."],
    performance: ["Keep synchronous checkout path short; batch workers and index pending states.", "Track checkout latency, reservation age, queue lag, and reconciliation mismatches."],
    scaling: ["Partition order streams by order ID to preserve per-order ordering.", "Scale independent consumers and apply downstream backpressure."],
    failures: ["Reconcile ambiguous payment outcomes; release expired reservations; dead-letter poison events.", "Operators need replay tools that remain idempotent and auditable."],
  },
  {
    id: "webhook-processing-service",
    title: "Webhook processing service",
    intro: "Receive untrusted provider callbacks quickly, durably, and idempotently despite retries and reordering.",
    requirements: ["Verify signatures on raw bodies, acknowledge quickly, deduplicate, process asynchronously, support replay.", "Per-provider schemas, secrets, rate limits, and observability."],
    architecture: ["Ingress validates and persists an envelope, then a queue dispatches provider-specific workers.", "Separate receipt from business processing and retain auditable outcomes."],
    database: ["Unique provider/event ID, payload hash, receipt time, status, attempt history, and retention policy.", "Inbox transaction prevents duplicate side effects."],
    apis: ["POST /webhooks/:provider with provider-specific signature and timestamp headers.", "Internal replay and inspection APIs require strong operator authorization."],
    security: ["Constant-time signature verification, timestamp tolerance, secret rotation, payload/body limits.", "Treat payload as untrusted and prevent SSRF in referenced URLs."],
    testing: ["Provider contract fixtures; altered signature/body tests; duplicate and out-of-order delivery.", "Crash between persistence and acknowledgement, then prove recovery."],
    performance: ["Avoid business work on ingress; control queue concurrency per provider/tenant.", "Measure acknowledgement latency, processing lag, duplicates, failures, and oldest event age."],
    scaling: ["Stateless ingress and partitioned durable queue; ordering key by external aggregate where needed.", "Autoscale workers on lag while protecting downstream services."],
    failures: ["Retry transient errors with jitter; dead-letter permanent failures; provide safe replay.", "Handle provider retry storms and unavailable queue/storage explicitly."],
  },
  {
    id: "event-driven-notifications",
    title: "Event-driven notification system",
    intro: "Deliver email, SMS, and push notifications from domain events with preferences, templates, and provider resilience.",
    requirements: ["Consume events, resolve preferences, render versioned templates, send through channels, track delivery.", "Deduplication, scheduling, quiet hours, unsubscribe, retries, and dead letters."],
    architecture: ["Event consumer creates notification intents; channel workers call providers behind adapters.", "Outbox emits status events and isolates template/policy from transport."],
    database: ["Notification intents, channel attempts, preferences, template versions, dedupe keys.", "Retention and partitioning support high-volume history."],
    apis: ["Preference and template management; operator search/replay; provider delivery callbacks.", "Domain producers publish events rather than invoking notification providers."],
    security: ["Authorize preference changes, validate templates, encrypt contact data, redact logs.", "Signed unsubscribe links and provider callback verification."],
    testing: ["Policy matrix tests, golden template tests, provider contract tests, duplicate event tests.", "Simulate throttling, bounce callbacks, partial channel failures, and replay."],
    performance: ["Batch provider calls where supported and cache templates/preferences with versioned keys.", "Track time-to-send, queue lag, provider latency, bounce and suppression rates."],
    scaling: ["Partition by recipient for ordering and by channel for independent capacity.", "Apply quotas, priority queues, and backpressure during campaigns."],
    failures: ["Fallback channels only with explicit product policy; avoid retrying permanent bounces.", "Circuit-break failing providers and preserve intents for controlled recovery."],
  },
  {
    id: "product-synchronization",
    title: "Scalable product synchronization service",
    intro: "Synchronize a large product catalog across an authoritative source and multiple external destinations.",
    requirements: ["Initial backfill, incremental change capture, mapping, validation, reconciliation, replay, progress visibility.", "At-least-once delivery with idempotent destination writes."],
    architecture: ["Snapshot reader and CDC feed produce versioned product changes into partitioned queues.", "Destination adapters normalize limits; reconciliation detects drift independently."],
    database: ["Source cursor/checkpoint, canonical product/version, destination mapping, sync attempts, errors.", "Use compare-and-set checkpoints so acknowledged progress never skips failed records."],
    apis: ["Start/cancel/status sync jobs; inspect and replay failures; destination adapter bulk upserts.", "Opaque cursors and bounded pages for large catalogs."],
    security: ["Per-tenant credentials in a secret manager, least-privilege destination scopes, encrypted data.", "Validate imported content and prevent tenant data crossover."],
    testing: ["Mapping and property tests, adapter contract tests, checkpoint crash recovery, reconciliation tests.", "Duplicate, stale, reordered, malformed, and rate-limited destination responses."],
    performance: ["Adaptive batches, bounded concurrency, streaming reads, bulk writes, compressed events.", "Measure throughput, lag, memory, destination quota, and reconciliation drift."],
    scaling: ["Partition by tenant/product while preserving per-product versions; fair scheduling prevents noisy neighbors.", "Autoscale consumers on lag but cap against destination quotas."],
    failures: ["Backoff with jitter and Retry-After; quarantine poison products; resume from durable checkpoints.", "Reconciliation repairs missed events and operator replay remains version-aware."],
  },
];

const pages = [
  {
    file: "13-docker.html",
    config: {
      id: 13,
      title: "Docker & Deployment",
      kicker: "Phase 13 · Production runtime",
      lead: "Package, ship, secure, observe, and recover Node.js services with explicit operational trade-offs.",
      topics: dockerTopics,
      prev: { file: "12-performance.html", title: "Phase 12 · Performance" },
      next: { file: "14-testing.html", title: "Phase 14 · Testing" },
    },
  },
  {
    file: "14-testing.html",
    config: {
      id: 14,
      title: "Testing",
      kicker: "Phase 14 · Confidence engineering",
      lead: "Choose test boundaries by risk, verify real contracts, and keep asynchronous systems deterministic.",
      topics: testingTopics,
      prev: { file: "13-docker.html", title: "Phase 13 · Docker & Deployment" },
      next: { file: "15-coding.html", title: "Phase 15 · Coding" },
    },
  },
  {
    file: "15-coding.html",
    config: {
      id: 15,
      title: "Coding: DSA & Practical JavaScript",
      kicker: "Phase 15 · Medium to hard",
      lead: "Practice backend-flavored invariants, complexity, edge cases, and production-aware JavaScript utilities.",
      topics: [...dsaTopics, ...practicalTopics],
      prev: { file: "14-testing.html", title: "Phase 14 · Testing" },
      next: { file: "16-projects.html", title: "Phase 16 · Projects" },
    },
  },
  {
    file: "16-projects.html",
    config: {
      id: 16,
      title: "Senior Node.js Projects",
      kicker: "Phase 16 · Portfolio systems",
      lead: "Build systems that demonstrate correctness, security, testing, operations, and scaling—not just framework fluency.",
      projects,
      prev: { file: "15-coding.html", title: "Phase 15 · Coding" },
      next: null,
    },
  },
];

fs.mkdirSync(PHASES_DIR, { recursive: true });
for (const { file, config } of pages) {
  const output = path.join(PHASES_DIR, file);
  fs.writeFileSync(output, phasePage(config), "utf8");
  console.log(`${file}: ${(config.topics || []).length} topics, ${(config.projects || []).length} projects`);
}
