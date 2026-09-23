/* eslint-disable max-len */
"use strict";

const fs = require("fs");
const path = require("path");
const { phasePage } = require("./shell");

const phasesDir = path.join(__dirname, "..", "phases");
fs.mkdirSync(phasesDir, { recursive: true });

function slug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function topic(title, concept, why, options = {}) {
  const domain = options.domain || "an order and payment service";
  return {
    id: options.id || slug(title),
    title,
    priority: options.priority || "High",
    concept,
    why,
    example: options.example || {
      kind: "node",
      code: options.code || `// Apply ${title} in ${domain}.\nconst decision = { orderId: "ord_42", strategy: "${slug(title)}" };\nconsole.log(decision);`,
      expected: options.expected || `{ orderId: "ord_42", strategy: "${slug(title)}" }`,
    },
    mistakes: options.mistakes || [
      `Treating ${title} as a library setting instead of defining its failure and consistency behavior.`,
      "Ignoring retries, concurrency, observability, and trust boundaries in production.",
    ],
    interview: options.interview || [
      `How would you apply ${title} to an order/payment API?`,
      `What failure mode changes your design for ${title}?`,
    ],
    answers: options.answers || [
      `${title} should be explained as a contract: state the invariant, the mechanism that preserves it, and the behavior under retry or partial failure.`,
      `For orders and payments, I make ownership, consistency boundaries, and externally visible errors explicit, then instrument the important decisions.`,
    ],
    senior: options.senior || [
      `What trade-off would make you reject the default ${title} approach?`,
      "How would you roll this out and prove it behaves correctly?",
    ],
    seniorAnswers: options.seniorAnswers || [
      "I compare correctness, latency, operability, and cost. I prefer the simplest mechanism that preserves the business invariant and has a safe degradation path.",
      "I use compatibility tests, staged rollout, metrics by outcome, structured audit events, and a rollback path; load and fault tests cover retries and dependency failure.",
    ],
    exercise: options.exercise || `Design a production-ready ${title} decision for an order/payment endpoint. State the invariant, failure response, telemetry, and one rejected alternative.`,
  };
}

const textExample = (code, expected) => ({ kind: "text", code, expected });
const nodeExample = (code, expected) => ({ kind: "node", code, expected });

const restTopics = [
  topic("REST principles", "REST models resources with stable identifiers and manipulates representations through a uniform, stateless HTTP interface. Constraints include client/server separation, cacheability, layered systems, and hypermedia where useful.", "Uniform semantics reduce coupling: clients depend on resource contracts rather than server implementation or RPC-shaped controller names.", {
    example: textExample("POST /orders\nGET /orders/ord_42\nPATCH /orders/ord_42\n\nRepresentation: { \"id\": \"ord_42\", \"status\": \"pending\" }", "Resource nouns, standard verbs, stateless requests"),
  }),
  topic("HTTP methods", "GET and HEAD are safe; PUT, DELETE, and safe methods are idempotent; POST is generally neither; PATCH semantics depend on the patch document.", "Method semantics let clients, gateways, retries, and caches behave correctly without application-specific knowledge.", {
    example: textExample("POST /orders              create\nGET /orders/ord_42         read\nPUT /orders/ord_42/address replace address\nPATCH /orders/ord_42       partial transition\nDELETE /orders/ord_42      cancel/remove", "Choose by semantics, not CRUD naming alone"),
  }),
  topic("HTTP status codes", "Use status families consistently: 2xx success, 3xx redirection/cache validation, 4xx client-contract failure, and 5xx server/dependency failure.", "Precise codes are machine-readable control flow for clients, retries, alerts, and SLOs.", {
    example: textExample("201 Created + Location: /orders/ord_42\n202 Accepted for asynchronous capture\n409 Conflict for an invalid state transition\n422 Unprocessable Content for domain validation\n503 Service Unavailable + Retry-After", "Never return 200 with { success: false }"),
  }),
  topic("Headers", "Headers carry representation metadata, negotiation, tracing, preconditions, authentication, caching, and retry advice outside the resource body.", "Separating protocol metadata from domain data enables generic infrastructure to understand requests.", {
    example: textExample("Authorization: Bearer <token>\nContent-Type: application/json\nAccept: application/json\nIdempotency-Key: pay-abc\nIf-Match: \"order-v7\"\nTraceparent: 00-...", "Validate and bound all untrusted header values"),
  }),
  topic("Cookies", "Cookies are browser-managed name/value state scoped by domain, path, lifetime, SameSite, Secure, and HttpOnly attributes.", "They enable automatic session transport, but that automatic behavior creates CSRF risk and demands narrow scope.", {
    example: textExample("Set-Cookie: __Host-session=<opaque>; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=1800", "__Host- prevents Domain and requires Secure + Path=/"),
  }),
  topic("Sessions", "A session keeps authentication state server-side and gives the client an opaque, rotating identifier.", "Server-side revocation and small browser credentials are useful, while a shared store is needed across instances.", {
    example: nodeExample("app.post('/logout', async (req, res) => {\n  await sessions.delete(req.session.id);\n  res.clearCookie('__Host-session');\n  res.sendStatus(204);\n});", "204 and the server-side session is invalidated"),
  }),
  topic("JWT", "A JWT is a signed set of claims, not encrypted state. Verify algorithm, signature, issuer, audience, expiry, and purpose before trusting claims.", "Local verification can reduce an authorization-server lookup, but revocation and claim staleness become design concerns.", {
    example: nodeExample("const claims = await jwtVerify(token, key, {\n  algorithms: ['RS256'], issuer: 'https://id.example', audience: 'orders-api'\n});\nif (claims.payload.typ !== 'access') throw new Error('wrong token type');", "Only validated access-token claims reach authorization"),
  }),
  topic("OAuth", "OAuth 2.0 delegates authorization. For user-facing clients, Authorization Code with PKCE exchanges a short-lived code for tokens without exposing the password.", "The resource owner can grant scoped access to a client while the authorization server centralizes consent and token issuance.", {
    example: textExample("Browser → /authorize?response_type=code&code_challenge=...\nCallback receives one-time code\nBackend → /token with code_verifier\nAPI validates access token audience + scope", "Use state for request correlation and exact redirect URI matching"),
  }),
  topic("Refresh tokens", "Refresh tokens are long-lived credentials used only at the authorization server to mint new access tokens. Rotate them and detect reuse.", "They preserve user sessions without making every API bearer credential long-lived.", {
    example: textExample("Store refresh token in Secure HttpOnly cookie\nRotate on every use\nIf an already-rotated token reappears: revoke the token family", "Never send refresh tokens to resource APIs"),
  }),
  topic("Access tokens", "Access tokens are short-lived, audience-bound credentials presented to an API and constrained by scopes or permissions.", "Short lifetimes limit replay impact; audience and scope prevent a valid token from becoming universally valid.", {
    example: textExample("aud=orders-api\nscope=orders:read payments:create\nexp=now+10m\nsub=user_17", "Authorize the action and resource, not merely token validity"),
  }),
  topic("Idempotency", "Idempotency makes repeated requests with the same intent produce one business effect. Persist a client key, request fingerprint, state, and original response atomically.", "Networks lose responses and clients retry; exactly-once transport is unavailable, so the server must deduplicate effects.", {
    example: nodeExample("await db.transaction(async tx => {\n  const prior = await tx.idempotency.findUnique({ key });\n  if (prior) return replay(prior);\n  const payment = await tx.payment.create({ orderId, amount });\n  await tx.idempotency.create({ key, requestHash, response: payment });\n});", "Concurrent duplicate keys resolve to one stored result"),
  }),
  topic("API versioning", "Version only when a change cannot be made backward-compatible. Common strategies are URL major versions or media-type negotiation.", "A version is a migration contract, not a substitute for additive evolution and deprecation discipline.", {
    example: textExample("GET /v1/orders/ord_42\nSunset: Sat, 31 Jan 2027 00:00:00 GMT\nDeprecation: true\nLink: </v2/orders/ord_42>; rel=\"successor-version\"", "Publish lifecycle, telemetry, migration guide, and removal date"),
  }),
  topic("Rate limiting", "Rate limits bound work by a meaningful identity using token bucket, sliding window, or fixed window algorithms, often enforced at edge and service layers.", "They protect capacity and fairness but must account for bursts, shared NATs, authenticated identity, and fail-open/fail-closed choices.", {
    example: textExample("Key: tenant:acme:payments:create\nLimit: token bucket 20 burst, 5/sec refill\n429 Too Many Requests\nRetry-After: 3", "Use stricter limits for expensive or abuse-prone operations"),
  }),
  topic("Caching", "HTTP caching uses Cache-Control, validators such as ETag, and Vary to reuse representations safely. Private and shared caches have different trust boundaries.", "Freshness and conditional requests reduce latency and load while validators avoid retransmitting unchanged data.", {
    example: textExample("Cache-Control: private, max-age=30\nETag: \"order-42-v7\"\nIf-None-Match: \"order-42-v7\"\n→ 304 Not Modified", "Do not publicly cache user-specific order data"),
  }),
  topic("Pagination", "Offset pagination requests a limit and offset/page. It is simple and supports random access but becomes costly and unstable on changing large datasets.", "The database may scan skipped rows, while inserts or deletes between requests cause duplicates and gaps.", {
    example: textExample("GET /orders?limit=25&offset=50\nSELECT ... ORDER BY created_at DESC, id DESC LIMIT 25 OFFSET 50", "Useful for small administrative datasets, not deep feeds"),
  }),
  topic("Cursor pagination", "Cursor pagination encodes the last deterministic sort tuple and applies a keyset predicate for the next page.", "An indexed seek is stable and scales independently of page depth; a unique tiebreaker prevents lost equal-sort rows.", {
    example: textExample("Cursor decodes to (created_at='2026-08-24T10:00Z', id='ord_42')\nWHERE (created_at, id) < ($1, $2)\nORDER BY created_at DESC, id DESC\nLIMIT 25", "Opaque, signed cursor; fetch limit + 1 to compute hasNext"),
  }),
  topic("API security", "API security layers authentication, object- and action-level authorization, validation, abuse controls, encryption, secure defaults, auditability, and dependency hygiene.", "No single control covers stolen credentials, confused-deputy bugs, injection, replay, and operational compromise.", {
    example: textExample("Gateway: TLS, coarse limits, body bounds\nService: authn, tenant/object authz, validation\nData: constraints, least privilege, encryption\nOps: secret rotation, audit logs, alerts", "Deny by default and test cross-tenant access"),
  }),
  topic("CORS", "CORS is a browser response-sharing policy. The server explicitly allows trusted origins, methods, and headers; credentialed requests require an exact origin.", "Same-origin policy blocks script access by default; CORS relaxes that boundary but is not authentication or a server-to-server firewall.", {
    example: nodeExample("const allowed = new Set(['https://shop.example']);\napp.use(cors({\n  origin(origin, cb) { cb(null, allowed.has(origin)); },\n  credentials: true,\n  methods: ['GET', 'POST']\n}));", "Never combine credentials with reflected arbitrary origins"),
  }),
  topic("CSRF", "CSRF causes a browser to submit an authenticated request chosen by an attacker. Use SameSite cookies plus origin checks and CSRF tokens for state changes.", "Browsers attach cookies automatically even when a hostile site initiates the request.", {
    example: textExample("Cookie: SameSite=Lax; Secure; HttpOnly\nPOST requires X-CSRF-Token matching server/session token\nReject unexpected Origin / Sec-Fetch-Site", "CORS alone does not stop simple cross-origin form submissions"),
  }),
  topic("Request validation", "Validate params, query, headers, and body at the boundary with strict schemas, size limits, canonicalization, and domain-level checks.", "TypeScript types disappear at runtime; malformed or over-posted input must not reach business logic.", {
    example: nodeExample("const input = CreateOrder.parse(req.body); // strict schema\nawait authorize(req.user, 'order:create', input.customerId);\nconst order = await service.create(input);", "400/422 with field errors; unknown fields rejected"),
  }),
  topic("Response formatting", "Use a consistent resource and collection envelope only where it adds metadata; preserve types, stable field names, links/cursors, and explicit nullability.", "Predictability simplifies clients and evolution, while unnecessary envelopes and inconsistent dates create coupling.", {
    example: textExample("{\n  \"data\": [{ \"id\": \"ord_42\", \"totalMinor\": 4999, \"currency\": \"USD\" }],\n  \"page\": { \"nextCursor\": \"opaque\", \"hasNext\": true }\n}", "Money uses minor units plus currency; timestamps use ISO 8601 UTC"),
  }),
  topic("Error handling", "Map known failures to stable public problem details; attach a correlation ID, log internal causes once, and distinguish retryable from permanent failures.", "Clients need actionable contracts while stack traces, SQL errors, and provider details must remain private.", {
    example: textExample("HTTP/1.1 409 Conflict\nContent-Type: application/problem+json\n{\n \"type\":\"https://api.example/problems/order-state\",\n \"title\":\"Invalid order transition\",\n \"status\":409,\n \"code\":\"ORDER_NOT_PAYABLE\",\n \"traceId\":\"tr_7\"\n}", "Stable machine code; safe human detail; no stack trace"),
  }),
  topic("Design e-commerce order API", "Model order creation, line-item price snapshots, inventory reservation, payment intent, state transitions, cancellation, and fulfillment as explicit resources and workflows.", "Order and payment lifecycles cross consistency boundaries; state machines and durable events make partial failure visible and recoverable.", {
    id: "scenario-ecommerce-order-api",
    example: textExample("POST /orders (Idempotency-Key)\nPOST /orders/{id}/payment-intents\nPOST /orders/{id}/cancel\nGET /orders/{id}\n\npending → reserved → payment_pending → paid → fulfilled\n                         ↘ failed/cancelled", "Transactional order write + outbox; async provider reconciliation"),
    mistakes: ["Letting clients set totals or arbitrary states.", "Holding a database transaction open across payment-provider calls."],
  }),
  topic("Prevent duplicate payment/order requests", "Combine idempotency keys, unique constraints, request fingerprints, atomic state transitions, provider idempotency, and reconciliation.", "Duplicate delivery and ambiguous timeouts are normal. Defense in depth prevents two local rows and two external charges.", {
    id: "scenario-prevent-duplicates",
    example: textExample("UNIQUE (merchant_id, idempotency_key)\nUNIQUE (order_id) WHERE payment_status IN ('processing','succeeded')\nCompare request hash before replay\nPass the same key to payment provider", "One intent, one durable outcome, replayed response"),
    mistakes: ["Using an in-memory Set for deduplication.", "Checking then inserting without a unique constraint or transaction."],
  }),
  topic("Secure a public API", "Start from assets and abuse cases, then layer TLS, scoped credentials, object authorization, schema/body limits, quotas, idempotency, safe errors, audit logs, and incident controls.", "Public reachability means every input and workflow is adversarial; controls must reduce both exploitability and blast radius.", {
    id: "scenario-secure-public-api",
    example: textExample("Edge → TLS/WAF/coarse quota\nAPI → token validation + scope + tenant/object authz\nHandler → strict schema + state invariant\nStorage → constraints + least privilege\nTelemetry → audit + anomaly alert + revocation", "Threat model includes BOLA, credential stuffing, injection, replay, and resource exhaustion"),
  }),
];

const SQL_SCHEMA = `-- Shared schema used throughout this phase
CREATE TABLE orders (
  id bigint PRIMARY KEY,
  customer_id bigint NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','paid','cancelled')),
  total_minor integer NOT NULL CHECK (total_minor >= 0),
  currency char(3) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payments (
  id bigint PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES orders(id),
  provider_ref text UNIQUE,
  status text NOT NULL CHECK (status IN ('processing','succeeded','failed')),
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);`;

function sqlExample(code, expected, headers, rows) {
  return {
    kind: "sql",
    code,
    expected,
    resultTable: { headers, rows },
  };
}

function sqlTopic(title, concept, why, query, expected, headers, rows, options = {}) {
  return topic(title, concept, why, {
    ...options,
    example: sqlExample(`${options.includeSchema ? `${SQL_SCHEMA}\n\n` : ""}${query}`, expected, headers, rows),
  });
}

const databaseTopics = [
  sqlTopic("Shared orders/payments schema", "The phase uses orders as the aggregate record and payments as child attempts, with checks, foreign keys, uniqueness, money in minor units, and UTC timestamps.", "A shared schema makes cardinality, integrity, transaction, and performance discussions concrete.", "SELECT o.id, o.status, p.status AS payment_status\nFROM orders o LEFT JOIN payments p ON p.order_id = o.id\nORDER BY o.id;", "Orders remain visible without a payment.", ["order_id", "order_status", "payment_status"], [["101", "paid", "succeeded"], ["102", "pending", "NULL"]], { includeSchema: true }),
  sqlTopic("SQL fundamentals", "SQL is declarative: SELECT projects, FROM forms inputs, WHERE filters, GROUP BY aggregates, HAVING filters groups, and ORDER BY defines output order.", "The optimizer chooses physical execution, so correctness depends on relational semantics rather than procedural reading order.", "SELECT id, total_minor\nFROM orders\nWHERE status = 'paid'\nORDER BY created_at DESC\nLIMIT 2;", "Two newest paid orders.", ["id", "total_minor"], [["101", "4999"], ["97", "2599"]]),
  sqlTopic("Joins", "Joins combine rows by predicates. INNER requires matches; LEFT preserves the left side; join cardinality can multiply parent rows.", "Understanding one-to-many cardinality prevents incorrect totals and missing orders.", "SELECT o.id, COUNT(p.id) AS attempts\nFROM orders o\nLEFT JOIN payments p ON p.order_id = o.id\nGROUP BY o.id\nORDER BY o.id;", "One row per order, including zero attempts.", ["order_id", "attempts"], [["101", "2"], ["102", "0"]]),
  sqlTopic("Subqueries", "A subquery produces a scalar, row set, or correlated test. EXISTS is often the clearest way to express presence without row multiplication.", "The optimizer may rewrite it, but semantic shape still affects null behavior and readability.", "SELECT o.id\nFROM orders o\nWHERE EXISTS (\n  SELECT 1 FROM payments p\n  WHERE p.order_id = o.id AND p.status = 'failed'\n);", "Orders having at least one failed payment.", ["order_id"], [["101"], ["108"]]),
  sqlTopic("CTEs", "A common table expression names an intermediate relation; recursive CTEs traverse hierarchies. Modern PostgreSQL may inline non-materialized CTEs.", "CTEs improve reasoning, but forced materialization can help or harm depending on reuse and filtering.", "WITH successful AS (\n  SELECT order_id, SUM(amount_minor) paid\n  FROM payments WHERE status = 'succeeded' GROUP BY order_id\n)\nSELECT o.id, s.paid\nFROM orders o JOIN successful s ON s.order_id = o.id;", "Successful payment totals by order.", ["order_id", "paid"], [["101", "4999"], ["110", "8000"]]),
  sqlTopic("Window functions", "Window functions compute across related rows without collapsing them. PARTITION BY defines groups and ORDER BY defines sequence.", "They solve ranking, running totals, and latest-per-group while preserving row detail.", "SELECT order_id, id AS payment_id,\n  row_number() OVER (PARTITION BY order_id ORDER BY created_at DESC, id DESC) AS attempt_no\nFROM payments;", "Payment attempts ranked newest-first per order.", ["order_id", "payment_id", "attempt_no"], [["101", "502", "1"], ["101", "501", "2"]]),
  sqlTopic("Aggregations", "Aggregates collapse groups; COUNT(*), COUNT(column), SUM, and filtered aggregates have distinct null semantics.", "Financial reports require correct grouping grain and must avoid duplicated amounts from joins.", "SELECT currency,\n  COUNT(*) FILTER (WHERE status='paid') AS paid_orders,\n  SUM(total_minor) FILTER (WHERE status='paid') AS revenue_minor\nFROM orders GROUP BY currency;", "Paid count and revenue per currency.", ["currency", "paid_orders", "revenue_minor"], [["USD", "12", "54988"], ["EUR", "4", "18200"]]),
  sqlTopic("Transactions", "A transaction commits related changes atomically. Keep it short, lock in a consistent order, and never wait on remote APIs while holding locks.", "Order transitions, payment rows, and outbox events must either become visible together or not at all.", "BEGIN;\nUPDATE orders SET status='paid' WHERE id=101 AND status='pending';\nINSERT INTO payments(id,order_id,status,amount_minor) VALUES (501,101,'succeeded',4999);\nCOMMIT;", "Both changes commit together; production code checks affected-row count.", ["updated_orders", "inserted_payments"], [["1", "1"]]),
  sqlTopic("ACID", "Atomicity groups effects, consistency preserves declared invariants, isolation controls concurrent visibility, and durability retains committed data.", "ACID is not automatic business correctness: constraints and transaction boundaries must encode the invariant.", "BEGIN;\nINSERT INTO payments(id,order_id,status,amount_minor)\nVALUES (502,101,'succeeded',-1);\nCOMMIT;", "The CHECK constraint aborts the invalid transaction.", ["committed", "reason"], [["false", "payments_amount_minor_check"]]),
  sqlTopic("Isolation levels", "Read Committed prevents dirty reads; Repeatable Read gives a stable snapshot; Serializable rejects executions that cannot be ordered serially.", "Higher isolation closes anomalies but increases retries and contention; select it from the invariant, not habit.", "BEGIN ISOLATION LEVEL SERIALIZABLE;\nSELECT status FROM orders WHERE id=101;\nUPDATE orders SET status='paid' WHERE id=101 AND status='pending';\nCOMMIT;", "One conflicting serializable transaction may fail and must retry.", ["transaction_a", "transaction_b"], [["commit", "serialization_failure"]]),
  sqlTopic("Locks", "Row locks coordinate conflicting writes; SELECT ... FOR UPDATE explicitly locks selected rows. Lock scope and duration determine contention.", "A guarded order transition can serialize competing payment completions without locking unrelated orders.", "BEGIN;\nSELECT status FROM orders WHERE id=101 FOR UPDATE;\nUPDATE orders SET status='paid' WHERE id=101 AND status='pending';\nCOMMIT;", "Concurrent writers for order 101 wait or fail under NOWAIT.", ["order_id", "lock"], [["101", "row exclusive"]]),
  sqlTopic("Deadlocks", "A deadlock is a cycle of transactions waiting on one another; the database aborts a victim.", "Applications must use deterministic lock order, short transactions, and bounded retry because detection cannot preserve both transactions.", "BEGIN;\nSELECT id FROM orders WHERE id IN (101,102)\nORDER BY id\nFOR UPDATE;", "Every workflow locks orders in ascending ID order.", ["first_lock", "second_lock"], [["101", "102"]]),
  sqlTopic("Indexes", "A B-tree index orders keys and row locators, accelerating selective predicates and ordering at the cost of storage and write amplification.", "An index helps only when its leading keys and selectivity fit the query; it does not make every lookup free.", "CREATE INDEX idx_orders_customer_created\nON orders(customer_id, created_at DESC);\n\nSELECT id FROM orders\nWHERE customer_id=7 ORDER BY created_at DESC LIMIT 10;", "Index scan can satisfy filter and order.", ["plan", "estimated_rows"], [["Index Scan", "10"]]),
  sqlTopic("Composite indexes", "A composite index is ordered lexicographically; equality on leading columns followed by range/order columns is a common design.", "Column order determines which query shapes can seek efficiently; redundant prefixes add write cost.", "CREATE INDEX idx_payments_order_status_created\nON payments(order_id, status, created_at DESC);\n\nSELECT id FROM payments\nWHERE order_id=101 AND status='failed'\nORDER BY created_at DESC;", "Uses the complete leading prefix.", ["index_keys", "query_match"], [["order_id,status,created_at", "full prefix"]]),
  sqlTopic("Partial indexes", "A partial index stores only rows satisfying a predicate and is usable when the query implies that predicate.", "It can be smaller and enforce conditional uniqueness, ideal for rare active states.", "CREATE UNIQUE INDEX one_live_payment_per_order\nON payments(order_id)\nWHERE status='processing';", "A second processing payment for one order is rejected.", ["order_id", "processing_rows_allowed"], [["101", "1"]]),
  sqlTopic("Query optimization", "Optimization begins with workload and evidence: reduce rows early, choose correct indexes, avoid N+1 and over-fetching, and validate under representative data.", "Rewrites based only on intuition can shift cost, break semantics, or optimize a non-bottleneck.", "SELECT o.id, p.id\nFROM orders o\nJOIN LATERAL (\n SELECT id FROM payments\n WHERE order_id=o.id ORDER BY created_at DESC LIMIT 1\n) p ON true\nWHERE o.customer_id=7;", "One set-based query returns the latest attempt per order.", ["order_id", "payment_id"], [["101", "502"], ["104", "520"]]),
  sqlTopic("EXPLAIN/EXPLAIN ANALYZE", "EXPLAIN shows the estimated plan; EXPLAIN ANALYZE executes and reports actual timing and row counts. BUFFERS reveals cache and I/O behavior.", "Estimate/actual divergence exposes stale statistics or correlated data; execution evidence identifies the expensive node.", "EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)\nSELECT * FROM payments\nWHERE order_id=101 AND status='failed';", "Inspect actual vs estimated rows, loops, buffers, and total time.", ["node", "actual_rows"], [["Index Scan", "2"]]),
  sqlTopic("Normalization", "Normalization separates facts to reduce update, insert, and delete anomalies; third normal form avoids non-key dependencies on non-key attributes.", "Payment attempts belong in their own relation instead of repeated columns on orders.", "SELECT o.id, p.id, p.status\nFROM orders o JOIN payments p ON p.order_id=o.id\nWHERE o.id=101;", "Normalized one-to-many payment attempts.", ["order_id", "payment_id", "status"], [["101", "501", "failed"], ["101", "502", "succeeded"]]),
  sqlTopic("Denormalization", "Denormalization duplicates or precomputes data for a measured read path, with an explicit source of truth and repair strategy.", "It trades simpler/faster reads for write complexity, lag, and consistency monitoring.", "ALTER TABLE orders ADD COLUMN successful_payment_id bigint;\n-- Maintained in the same transaction as payment success.", "Latest successful payment is directly readable.", ["read_joins", "consistency_strategy"], [["0", "transaction + reconciliation"]]),
  sqlTopic("Database constraints", "NOT NULL, CHECK, UNIQUE, exclusion, and foreign-key constraints are concurrency-safe final guards for invariants expressible in one database.", "Application validation improves errors, but only the database sees all writers atomically.", "ALTER TABLE payments\nADD CONSTRAINT payment_amount_positive CHECK (amount_minor > 0),\nADD CONSTRAINT provider_ref_unique UNIQUE(provider_ref);", "Invalid amount or duplicate provider reference is rejected.", ["constraint", "protected_invariant"], [["CHECK", "positive amount"], ["UNIQUE", "provider deduplication"]]),
  sqlTopic("Foreign keys", "A foreign key requires each child reference to match a parent key and needs thoughtful indexes on child columns.", "It prevents orphan payments even if a script, migration, or another service bypasses application checks.", "INSERT INTO payments(id,order_id,status,amount_minor)\nVALUES (999,999999,'processing',4999);", "Fails because order 999999 does not exist.", ["inserted", "error"], [["false", "foreign_key_violation"]]),
  sqlTopic("Cascades", "ON DELETE/UPDATE actions encode lifecycle coupling: RESTRICT, CASCADE, SET NULL, or NO ACTION. Deleting financial records is usually restricted or soft-deleted.", "An accidental cascade can erase a large graph and audit history; lifecycle semantics must be explicit.", "ALTER TABLE payments DROP CONSTRAINT payments_order_id_fkey;\nALTER TABLE payments ADD FOREIGN KEY(order_id)\nREFERENCES orders(id) ON DELETE RESTRICT;", "An order with payments cannot be physically deleted.", ["delete_order", "result"], [["101", "restricted"]]),
  sqlTopic("Connection pooling", "A pool amortizes connection setup and caps database concurrency. Bound per-instance pools against the global database limit and use timeouts.", "Too many connections increase memory and context switching; queues in the app are safer than overload in the database.", "SELECT count(*) AS active\nFROM pg_stat_activity\nWHERE datname=current_database();", "Monitor active, idle, wait time, acquisition timeout, and saturation.", ["active_connections"], [["48"]]),
  sqlTopic("Read replicas", "Replicas asynchronously replay primary changes and serve stale-tolerant reads. Writes and read-after-write paths stay on the primary unless consistency is coordinated.", "They scale reads and improve recovery options but do not increase write capacity and introduce lag.", "SELECT pg_last_wal_replay_lsn(), pg_last_xact_replay_timestamp();", "Replica lag is measured and routed around for freshness-sensitive order reads.", ["replica_lag_ms", "route"], [["42", "replica"], ["3500", "primary"]]),
  sqlTopic("Database scaling", "Scale by fixing queries first, then larger nodes, replicas, partitioning, caching, archival, and finally sharding by a stable ownership key.", "Every distribution boundary adds routing, rebalancing, cross-shard transaction, and operational complexity.", "SELECT customer_id, count(*) AS orders\nFROM orders GROUP BY customer_id\nORDER BY orders DESC LIMIT 3;", "Check tenant skew before choosing customer_id as a shard key.", ["customer_id", "orders"], [["7", "220000"], ["9", "8500"]]),
  topic("Prisma schema", "Prisma schema defines datasource, generator, models, fields, indexes, mappings, and referential actions; migrations make the database change explicit.", "The schema improves type-safe access but must still model database constraints and indexes rather than only TypeScript convenience.", {
    example: nodeExample("model Order {\n  id         BigInt    @id\n  status     String\n  totalMinor Int\n  payments   Payment[]\n  @@index([status])\n}\nmodel Payment {\n  id      BigInt @id\n  orderId BigInt\n  order   Order  @relation(fields: [orderId], references: [id], onDelete: Restrict)\n  @@index([orderId])\n}", "Generated client reflects the shared relation"),
  }),
  topic("Prisma relations", "Prisma relation fields are client-level navigation; scalar foreign-key fields and database constraints store the relation. Nested writes can be atomic.", "Confusing implicit navigation with physical constraints causes missing indexes or surprising referential behavior.", {
    example: nodeExample("const order = await prisma.order.findUnique({\n  where: { id: 101n },\n  include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } }\n});", "Order with its latest payment"),
  }),
  topic("Prisma transactions", "Use nested writes for dependent records, batch transactions for independent operations, and interactive transactions only for short read-modify-write logic.", "Long interactive transactions hold connections and locks; remote calls inside them create contention and ambiguous outcomes.", {
    example: nodeExample("await prisma.$transaction(async tx => {\n  const changed = await tx.order.updateMany({\n    where: { id: 101n, status: 'pending' }, data: { status: 'paid' }\n  });\n  if (changed.count !== 1) throw new Error('ORDER_NOT_PAYABLE');\n  await tx.payment.create({ data: payment });\n});", "Guarded transition and payment insert commit atomically"),
  }),
  topic("N+1 problems", "N+1 occurs when one query loads parents and one additional query runs per parent. Batch relations, join/select strategically, or use a DataLoader request cache.", "Latency and database load scale with result count even though each individual query looks fast.", {
    example: nodeExample("const orders = await prisma.order.findMany({\n  where: { customerId },\n  include: { payments: { where: { status: 'succeeded' }, take: 1 } }\n});", "Bounded query count instead of one payment query per order"),
  }),
  topic("Prisma query optimization", "Select only needed fields, bound collections, filter in the database, align indexes to generated SQL, and inspect query logs and plans.", "ORM ergonomics can hide over-fetching, relation fan-out, and predicates that cannot use an index.", {
    example: nodeExample("const rows = await prisma.order.findMany({\n  where: { customerId: 7n, status: 'paid' },\n  select: { id: true, totalMinor: true, createdAt: true },\n  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 25\n});", "A narrow, indexed, bounded query"),
  }),
  topic("Prisma performance", "Treat Prisma as part of the data path: reuse one client, size pools globally, measure generated queries, avoid cold-start connection storms, and monitor transaction duration.", "Type safety does not guarantee efficient SQL or healthy connection behavior.", {
    example: nodeExample("const prisma = globalThis.prisma ?? new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });\nprisma.$on('query', e => metrics.observe('db.query.ms', e.duration));\nif (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;", "One development client and query-duration telemetry"),
  }),
  topic("Raw SQL when appropriate", "Use parameterized raw SQL when the ORM cannot express a window function, CTE, lock, bulk operation, database feature, or a proven hot query clearly.", "Raw SQL can improve capability and control, but loses some portability and type safety; never interpolate untrusted values.", {
    example: nodeExample("const latest = await prisma.$queryRaw`\n  SELECT DISTINCT ON (order_id) order_id, id, status\n  FROM payments\n  WHERE order_id = ANY(${orderIds})\n  ORDER BY order_id, created_at DESC, id DESC\n`;", "Parameterized latest-payment query; result is runtime-validated"),
  }),
];

const redisTopics = [
  topic("Redis fundamentals", "Redis is an in-memory data-structure server with single-threaded command execution per shard, optional persistence, replication, clustering, and atomic commands/scripts.", "Low latency comes from memory and efficient structures, but durability, failover, hot keys, and memory eviction must be designed explicitly.", { example: textExample("SET order:101:status paid\nGET order:101:status\nINFO memory\nINFO replication", "Fast does not mean durable or strongly consistent across failover") }),
  topic("Key/value storage", "Keys should encode namespace and identity; values may be strings, hashes, sets, sorted sets, streams, or probabilistic structures.", "Data-structure choice controls atomic operations, memory use, and access patterns.", { example: textExample("HSET order:101 status paid totalMinor 4999 currency USD\nHGETALL order:101\nSADD customer:7:orders 101", "Bound key/value sizes and avoid unbounded collections") }),
  topic("TTL", "TTL sets automatic expiry in seconds or milliseconds. Expiry is metadata on the key and may be refreshed, preserved, or removed by writes depending on the command.", "TTL bounds staleness and memory but is not precise scheduling or guaranteed immediate deletion.", { example: textExample("SET order:101:summary '{...}' EX 60\nTTL order:101:summary\nEXPIRE order:101:summary 120 GT", "Positive TTL counts down; -1 means no expiry; -2 means absent") }),
  topic("Cache-aside", "The application reads cache, falls back to the database on miss, then populates cache; writes update the database and invalidate or refresh cache.", "Only requested data is cached and cache failure can degrade to the source, but races can reinsert stale data.", { example: nodeExample("let order = await redis.get(key);\nif (!order) {\n  order = await db.order.findUnique({ where: { id } });\n  await redis.set(key, JSON.stringify(order), { EX: 60 });\n}\nreturn JSON.parse(order);", "Hit avoids DB; miss populates a bounded-TTL entry") }),
  topic("Write-through", "Writes synchronously update the system of record and cache before success is returned, with an explicit ordering and compensation policy.", "Reads stay warm, but dual writes cannot be atomic across Redis and the database without accepting or repairing inconsistency.", { example: textExample("1. Commit order to PostgreSQL\n2. SET cache value with TTL\n3. If cache write fails, return success and invalidate/retry asynchronously", "Database remains source of truth") }),
  topic("Write-behind", "Writes land in a cache or durable buffer and are persisted asynchronously in batches.", "It reduces write latency and enables batching but risks data loss, reorder, and harder recovery; plain Redis cache is rarely suitable for payment truth.", { example: textExample("Client → durable stream → acknowledged\nWorker batches updates → database\nTrack offsets, retries, poison records, and idempotency", "Do not use volatile write-behind for financial state") }),
  topic("Distributed cache", "A distributed cache partitions and replicates entries across nodes. Clients must handle topology, failover, serialization versions, and partial outages.", "It increases shared capacity but introduces network latency, hot-key concentration, replication lag, and failover consistency windows.", { example: textExample("Key includes tenant and schema version:\nv3:tenant:acme:order:101\nHash tags only when multi-key colocation is required:\n{order:101}:summary", "Measure hit ratio, p95 latency, evictions, errors, and hot keys") }),
  topic("Distributed locks", "A Redis lock commonly uses SET key token NX PX ttl and a compare-token-and-delete Lua script. The lease can expire while work continues.", "The random token prevents deleting another owner's lease, but a lock alone cannot protect a correctness-critical resource from paused or partitioned clients.", { example: textExample("SET lock:order:101 <random-token> NX PX 5000\n-- release atomically only if GET(key) == token\n-- pass a monotonic fencing token to the protected store", "Use database constraints/transactions for payment invariants; fencing for stale owners") }),
  topic("Rate limiting", "Redis implements atomic fixed/sliding windows, token buckets, or GCRA near the request path, keyed by authenticated tenant/user/action.", "Shared atomic state coordinates many API instances, but outage policy and cluster key placement matter.", { example: textExample("Lua atomically:\n1. refill tokens by elapsed time\n2. consume cost if available\n3. return allowed, remaining, retryAfter\nKey: rl:tenant:acme:payment:create", "429 with Retry-After; fail closed only for high-risk actions") }),
  topic("Sessions", "Store opaque session records in Redis with TTL, rotate IDs after authentication or privilege change, and index user sessions for revocation.", "Redis provides shared low-latency session state, while expiry and deletion support logout and revocation.", { example: textExample("SET session:<sha256-id> '{\"userId\":17,\"roles\":[\"buyer\"]}' EX 1800\nSADD user:17:sessions <sha256-id>\nOn logout: DEL + SREM", "Cookie contains only an opaque Secure HttpOnly session ID") }),
  topic("Pub/Sub", "Redis Pub/Sub delivers transient messages to currently connected subscribers with no replay, acknowledgement, or consumer state.", "It is useful for ephemeral notifications and invalidation hints, not durable order/payment processing.", { example: textExample("PUBLISH cache-invalidate '{\"orderId\":101,\"version\":8}'\nSUBSCRIBE cache-invalidate", "Disconnected subscribers miss messages; use Streams/queue for durable work") }),
  topic("Cache an expensive API", "Cache normalized expensive responses by tenant, authorization-sensitive inputs, API version, and query fingerprint; use TTL, bounds, and negative caching selectively.", "A well-designed key avoids data leakage and maximizes reuse while a stale-if-error policy can protect availability.", { id: "scenario-cache-expensive-api", example: textExample("key = sha256('v2|tenant=acme|order=101|currency=USD')\nTTL = 5m + random jitter\nDo not cache provider 401/429 as successful data", "Single-flight fill; metrics separate hit, miss, stale, and bypass") }),
  topic("Stale cache", "Staleness is controlled with TTL, versioned keys, write invalidation, event-driven invalidation, and explicit stale-while-revalidate windows.", "Perfect invalidation across stores is expensive; define an acceptable staleness budget per field and operation.", { id: "scenario-stale-cache", example: textExample("Cache value: { version: 8, cachedAt: ..., order: ... }\nDB commit emits order.updated(version=9)\nConsumer deletes only cached versions < 9", "Payment status may require primary read; catalog copy can tolerate staleness") }),
  topic("Prevent cache stampede", "Use request coalescing/single-flight, short fill locks, TTL jitter, stale-while-revalidate, and proactive refresh for hot keys.", "When a hot key expires, simultaneous misses can overload the database and prolong the outage.", { id: "scenario-cache-stampede", example: textExample("On miss:\n- one owner gets fill:order:101 lease\n- others serve bounded stale value or wait briefly\n- owner populates with TTL 60s + random(0..10s)", "Lock owner uses timeout; all paths have backpressure") }),
  topic("Distributed locking scenario", "For a scheduled order reconciliation, use a bounded lease for duplicate-work reduction, an owner token, renewal, and idempotent work; use fencing or database state for correctness.", "Process pauses and network partitions can create two apparent owners, so the protected system must reject stale writers.", { id: "scenario-distributed-locking", example: textExample("Acquire lease + increment fencing counter → fence=43\nUPDATE orders SET ... WHERE id=101 AND last_fence < 43\nStore last_fence=43 atomically", "Lease limits coordination; fencing enforces ordering") }),
];

function authTopic(title, concept, why, options = {}) {
  const attack = options.attack || `Attack → control: abuse of ${title} → deny by default, validate at the trust boundary, constrain scope, rate-limit, and audit.`;
  return topic(title, concept, why, {
    ...options,
    mistakes: options.mistakes || [
      attack,
      "Trusting client-visible claims or identifiers without server-side authorization.",
    ],
    answers: options.answers || [
      attack,
      `I treat ${title} as one layer: authenticate the principal, authorize this action on this object, constrain lifetime/scope, and make revocation and detection operational.`,
    ],
  });
}

const authTopics = [
  authTopic("JWT", "JWTs are signed claim containers. Pin allowed algorithms and validate signature, issuer, audience, expiry/not-before, token type, and required claims.", "A valid signature proves issuer possession of a key, not user authorization, confidentiality, freshness, or correct audience.", { attack: "Attack → control: alg confusion, forged or cross-service token → pin algorithms and validate iss/aud/typ with managed keys.", example: textExample("Header: alg=RS256, kid=key-2026-08\nClaims: iss=id.example, aud=orders-api, typ=access, exp=...\nVerify against cached JWKS with rotation and unknown-kid refresh limits", "Reject none, unexpected algorithms, wrong audience, expiry, or token type") }),
  authTopic("OAuth 2.0", "OAuth 2.0 is delegated authorization. Authorization Code + PKCE is the default user flow; Client Credentials serves machine identities.", "It separates credential handling, consent, clients, authorization servers, and resource servers.", { attack: "Attack → control: authorization-code interception or login CSRF → PKCE, state, exact redirect URIs, one-time short-lived codes.", example: textExample("User client: Authorization Code + PKCE\nService: Client Credentials + private_key_jwt/mTLS where needed\nAPI: validate audience and scopes", "Do not use OAuth access tokens as proof of identity without OIDC") }),
  authTopic("OpenID Connect", "OIDC adds authentication and identity claims to OAuth via an ID token, UserInfo endpoint, discovery, nonce, and standardized subject semantics.", "It lets a client verify an authentication event while access tokens remain intended for APIs.", { attack: "Attack → control: token substitution/replay → validate ID-token nonce, issuer, audience/azp, signature and expiry; never send ID token to APIs.", example: textExample("Client validates ID token: iss, aud, azp, exp, nonce\nAPI validates access token: aud=orders-api, scope\nStable identity key: (iss, sub)", "ID token authenticates to client; access token authorizes API") }),
  authTopic("Access and refresh tokens", "Access tokens are short-lived and audience/scoped; refresh tokens are longer-lived authorization-server credentials that should rotate with reuse detection.", "Separating lifetimes limits bearer replay while preserving sessions.", { attack: "Attack → control: stolen bearer/refresh token → short access TTL, sender constraint where possible, secure storage, refresh rotation and family revocation.", example: textExample("Access: memory, 5–15 min, aud=orders-api\nRefresh: Secure HttpOnly cookie, rotated per use\nReuse of old refresh token: revoke family and require login", "Never persist browser access tokens in localStorage when a safer BFF/session design is available") }),
  authTopic("Password hashing", "Password storage uses a salted, deliberately expensive password KDF and stores its encoded parameters with the hash; optional pepper is held outside the database.", "Offline attackers can test guesses without rate limits, so per-guess cost and unique salts reduce throughput and precomputation.", { attack: "Attack → control: stolen password database → Argon2id/bcrypt with calibrated cost, unique salts, optional managed pepper, breached-password checks.", example: nodeExample("const hash = await argon2.hash(password, {\n  type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1\n});\nconst ok = await argon2.verify(hash, candidate);", "Calibrate to an acceptable server latency and rehash when parameters age") }),
  authTopic("bcrypt and Argon2", "Argon2id is a modern memory-hard default. bcrypt is mature but has a 72-byte input limit and primarily raises CPU cost.", "Algorithm choice and calibrated parameters determine resistance to GPU/ASIC cracking and server-side denial of service.", { attack: "Attack → control: GPU cracking → prefer calibrated Argon2id memory/time cost; for bcrypt enforce input handling and a strong cost.", example: textExample("Argon2id: benchmark memory/time/parallelism in production class hardware\nbcrypt: cost benchmark + explicit max input handling\nOn login: verify old hash, then opportunistically rehash", "Versioned encoded hashes permit gradual migration") }),
  authTopic("Sessions", "Server-side sessions map a high-entropy opaque ID to identity, authentication context, expiry, and authorization version; rotate on privilege changes.", "They simplify revocation and keep claims fresh, at the cost of shared state.", { attack: "Attack → control: session fixation/hijacking → rotate ID after login, Secure HttpOnly SameSite cookie, idle/absolute expiry and revocation.", example: textExample("Cookie: __Host-session=<256-bit random>; Secure; HttpOnly; SameSite=Lax; Path=/\nServer record: userId, authTime, rolesVersion, idleExp, absoluteExp", "Store a hash of the session ID if session storage disclosure is in scope") }),
  authTopic("RBAC", "Role-based access control assigns permissions to roles and roles to principals. Roles should represent stable job functions, not every contextual exception.", "RBAC simplifies administration but can cause role explosion and does not replace object ownership or tenant checks.", { attack: "Attack → control: horizontal/vertical privilege escalation → centralized deny-by-default policy using role permission plus tenant/object conditions.", example: nodeExample("authorize(user, 'order:refund', order, ({ roles, tenantId }, resource) =>\n  roles.includes('support_refunds') && tenantId === resource.tenantId\n);", "A role permits the action; resource context constrains the target") }),
  authTopic("Permissions", "Permissions are action-oriented capabilities such as order:read or payment:refund, evaluated with principal, resource, and environment context.", "Fine-grained permissions create stable policy vocabulary and least privilege, while clients must never be the source of truth.", { attack: "Attack → control: BOLA/IDOR → authorize every object using server-loaded tenant/ownership data, not guessed IDs or UI visibility.", example: textExample("Principal: user=17 tenant=acme\nAction: payment:refund\nResource: payment.tenant=acme, amount=4999\nPolicy: permission + same tenant + refund window", "Log policy decision ID and reason without leaking sensitive policy internals") }),
  authTopic("API keys", "API keys identify a calling project or service and should be random, scoped, hashed at rest, prefixed for identification, rotatable, and separately rate-limited.", "They are simple bearer credentials, not end-user identity or proof of request integrity.", { attack: "Attack → control: leaked key → least scopes, hash at rest, secret scanning, rotation/revocation, anomaly detection, optional signed requests.", example: textExample("Authorization: ApiKey live_kid_abcd.<secret>\nDB stores kid, hash(secret), scopes, owner, expiresAt, lastUsedAt\nShow secret once", "Never put API keys in URLs or browser-delivered code") }),
  authTopic("CORS", "CORS controls whether browser JavaScript may read a cross-origin response. Credentialed requests require exact trusted origins and Vary: Origin.", "It is a browser sharing policy, not authentication, authorization, or protection from non-browser clients.", { attack: "Attack → control: hostile origin reads credentialed data → strict origin allowlist, no wildcard with credentials, minimal methods/headers.", example: textExample("Access-Control-Allow-Origin: https://shop.example\nAccess-Control-Allow-Credentials: true\nVary: Origin\nPreflight validates requested method and headers", "Do not reflect Origin merely because it is present") }),
  authTopic("CSRF", "CSRF exploits ambient browser credentials to trigger state changes. SameSite, origin/fetch-metadata checks, and synchronizer or double-submit tokens provide layers.", "The attacker need not read the response for a forged transfer, address change, or order cancellation to succeed.", { attack: "Attack → control: cross-site state-changing request → SameSite cookie + CSRF token + Origin/Sec-Fetch-Site validation.", example: textExample("POST /orders/101/cancel\nCookie: session=...\nX-CSRF-Token: random bound to session\nOrigin: https://shop.example", "GET remains safe; token is not stored in a cross-site-readable location") }),
  authTopic("XSS", "XSS executes attacker-controlled script in a trusted origin. Prevent with context-aware output encoding, safe DOM APIs, sanitization for allowed HTML, and CSP defense in depth.", "Once script runs in-origin it can act as the user even if HttpOnly prevents directly reading the session cookie.", { attack: "Attack → control: stored/reflected/DOM XSS → auto-escaping, no unsafe sinks, vetted sanitizer, strict CSP with nonces.", example: textExample("Render order note as textContent, not innerHTML\nContent-Security-Policy: default-src 'self'; script-src 'nonce-<random>'; object-src 'none'; base-uri 'none'", "HttpOnly reduces token theft but does not stop authenticated actions by injected script") }),
  authTopic("SQL injection", "SQL injection occurs when untrusted data changes query structure. Parameterized queries separate code from values; allowlist dynamic identifiers.", "Escaping is context fragile, and ORMs are safe only when their parameterization is not bypassed.", { attack: "Attack → control: crafted order ID alters SQL → placeholders/prepared statements, allowlisted sort columns, least-privilege DB role.", example: nodeExample("const order = await prisma.order.findUnique({ where: { id: BigInt(req.params.id) } });\n// Raw: prisma.$queryRaw`SELECT * FROM orders WHERE id = ${id}`\n// Never $queryRawUnsafe with concatenated input.", "Input remains data and cannot add SQL syntax") }),
  authTopic("SSRF", "SSRF makes a server fetch an attacker-influenced destination, potentially reaching metadata, loopback, private networks, or trusted services.", "Server network position and credentials make outbound requests more privileged than browser requests.", { attack: "Attack → control: malicious webhook/image URL reaches metadata/internal admin → destination allowlist, DNS/IP validation after resolution, egress firewall, redirect revalidation.", example: textExample("Allow https only\nResolve host; reject loopback/private/link-local/metadata ranges\nPin/revalidate destination on redirects and connection\nSet response-size and time limits", "URL parsing alone is insufficient because of DNS rebinding and redirects") }),
  authTopic("Rate limiting", "Security rate limits are keyed by multiple signals—account, tenant, API key, IP/device, and action—with costs proportional to risk and work.", "One global IP limit harms NAT users and is easy to distribute around; layered limits slow abuse and protect capacity.", { attack: "Attack → control: credential stuffing/resource exhaustion → atomic layered token buckets, progressive challenges, bounded queues and 429 Retry-After.", example: textExample("login: per-account + per-IP-prefix + global anomaly limit\npayment: per-user + tenant + idempotency key\npassword reset: always generic response", "Rate limits complement, not replace, authorization and capacity planning") }),
  authTopic("Brute-force protection", "Protect authentication with rate limits, progressive delay, MFA/passkeys, breached-password checks, risk signals, and user alerts without creating account-enumeration leaks.", "Permanent lockouts enable denial of service; IP-only controls fail against distributed attacks.", { attack: "Attack → control: password spraying/credential stuffing → account+network throttles, MFA, compromised-password screening, generic errors and detection.", example: textExample("Return same status/body/timing shape for unknown user and wrong password\nAfter risk threshold: delay/challenge, do not permanently lock\nAlert user on suspicious success", "Metrics distinguish attempts, unique accounts, sources, challenges, and successful compromise indicators") }),
  authTopic("Secure cookies", "Security-sensitive cookies use Secure, HttpOnly, SameSite, narrow lifetime/path, and preferably the __Host- prefix; contents are opaque or integrity-protected.", "Cookie attributes constrain transport and script access, but confidentiality still depends on HTTPS and server design.", { attack: "Attack → control: network theft/script theft/cross-site sending → Secure + HTTPS, HttpOnly, SameSite, short lifetime and host-only scope.", example: textExample("Set-Cookie: __Host-session=<opaque>; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=1800", "No Domain attribute; rotate ID; clear with matching attributes") }),
  authTopic("Secrets management", "Secrets belong in a managed vault/KMS with workload identity, least-privilege access, rotation, versioning, audit, and memory/log hygiene.", "Environment variables are delivery mechanisms, not complete lifecycle management; committed or long-lived secrets spread blast radius.", { attack: "Attack → control: repository/log/host secret exposure → vault, short-lived credentials, workload identity, scanning, redaction and tested rotation.", example: textExample("Workload identity → vault auth\nFetch versioned payment-provider key at startup/refresh\nRedact headers and connection strings\nDual-key rotation: issue new → deploy → revoke old", "Never print secrets; inventory owners, consumers, expiry, and rotation status") }),
  authTopic("HTTPS and TLS basics", "TLS authenticates the server and encrypts/integrity-protects transport. Modern configurations use TLS 1.2/1.3, valid certificates, safe ciphers, HSTS, and correct proxy termination.", "Without TLS, credentials and responses can be observed or modified; application signatures do not generally replace channel security.", { attack: "Attack → control: interception/downgrade → TLS 1.2/1.3, certificate validation, HSTS, redirect HTTP, secure internal service identity where required.", example: textExample("Strict-Transport-Security: max-age=31536000; includeSubDomains\nTrust X-Forwarded-Proto only from known proxy\nAutomate certificate issuance and expiry alerts", "TLS protects transit, not compromised endpoints, logs, or authorization flaws") }),
];

const pages = [
  {
    file: "05-rest.html",
    config: {
      id: "05",
      title: "REST APIs",
      kicker: "Phase 05 · Production HTTP contracts",
      lead: "Design predictable order and payment APIs that remain correct under retries, concurrency, untrusted clients, and partial failure.",
      topics: restTopics,
      prev: { file: "04-express.html", title: "04 Express" },
      next: { file: "06-databases.html", title: "06 Databases" },
    },
  },
  {
    file: "06-databases.html",
    config: {
      id: "06",
      title: "Databases & Prisma",
      kicker: "Phase 06 · Relational correctness and performance",
      lead: "Reason from a shared orders/payments schema through SQL semantics, concurrency, indexing, scaling, and production Prisma trade-offs.",
      topics: databaseTopics,
      prev: { file: "05-rest.html", title: "05 REST APIs" },
      next: { file: "07-redis.html", title: "07 Redis" },
    },
  },
  {
    file: "07-redis.html",
    config: {
      id: "07",
      title: "Redis",
      kicker: "Phase 07 · Low-latency state with explicit failure modes",
      lead: "Use Redis for caching, coordination, limits, and sessions without mistaking a fast distributed system for a correctness boundary.",
      topics: redisTopics,
      prev: { file: "06-databases.html", title: "06 Databases" },
      next: { file: "08-auth-security.html", title: "08 Auth & Security" },
    },
  },
  {
    file: "08-auth-security.html",
    config: {
      id: "08",
      title: "Authentication & Security",
      kicker: "Phase 08 · Identity, authorization, and attack resistance",
      lead: "Connect each common attack to concrete preventive, detective, and recovery controls for a senior Node.js order/payment platform.",
      topics: authTopics,
      prev: { file: "07-redis.html", title: "07 Redis" },
      next: { file: "09-microservices.html", title: "09 Microservices" },
    },
  },
];

for (const page of pages) {
  fs.writeFileSync(path.join(phasesDir, page.file), phasePage(page.config), "utf8");
  console.log(`${page.file}: ${page.config.topics.length} topics`);
}

console.log(`Total: ${pages.reduce((sum, page) => sum + page.config.topics.length, 0)} topics`);
