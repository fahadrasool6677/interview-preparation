#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { phasePage } = require("./shell");

const root = path.resolve(__dirname, "..");
const phasesDir = path.join(root, "phases");

function slug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function topic(title, concept, why, example, options = {}) {
  const mechanism = options.mechanism || concept;
  return {
    id: options.id || slug(title),
    title,
    priority: options.priority || "High",
    concept,
    why,
    example: typeof example === "string" ? { kind: "text", code: example } : example,
    mistakes: options.mistakes || [
      `Treating ${title.toLowerCase()} as a product choice without measuring its operational cost.`,
      "Explaining only the happy path; senior answers include overload, partial failure, and recovery.",
    ],
    interview: options.interview || [
      `Explain ${title.toLowerCase()} and when you would use it.`,
      `What production signal tells you this design is failing?`,
    ],
    answers: options.answers || [
      `<strong>Model answer:</strong> ${mechanism} I would define the SLO, instrument the critical path, and validate the decision under realistic load before standardizing it.`,
      "<strong>Failure signal:</strong> Watch latency percentiles, error/timeout rate, saturation, backlog, and business-level correctness—not averages alone.",
    ],
    senior: options.senior || [
      "How does this behave during a partial outage or retry surge?",
      "Which trade-off would make you reverse this decision?",
    ],
    seniorAnswers: options.seniorAnswers || [
      "Bound concurrency and retries, use deadlines and backpressure, preserve idempotency, and make degradation explicit. Recovery must be tested, not assumed.",
      "Reverse the choice when measured complexity, tail latency, consistency risk, or on-call burden exceeds the isolation or scaling benefit.",
    ],
    exercise:
      options.exercise ||
      `Sketch a production-ready use of ${title.toLowerCase()}. Include SLOs, telemetry, one failure injection, and a rollback or recovery path.`,
  };
}

function topicsFrom(definitions) {
  return definitions.map(([title, concept, why, example, options]) =>
    topic(title, concept, why, example, options),
  );
}

const microservices = topicsFrom([
  ["Monolith vs microservices", "A modular monolith deploys one unit; microservices add independent deployment and failure boundaries across a network.", "Distribution buys team and scaling autonomy but adds latency, consistency, testing, and on-call cost. Start with constraints, not fashion.", "Decision: independently scale checkout and search only after module ownership and release contention become measurable."],
  ["Service boundaries", "A boundary should follow a business capability with cohesive data and a clear owner, not a technical layer.", "High cohesion limits cross-service changes. Owning data prevents hidden coupling through shared tables.", "Order owns order lifecycle; Payment owns authorization and ledger references. Neither writes the other's tables."],
  ["Communication patterns", "Use synchronous calls for immediate answers and asynchronous messages for decoupling, buffering, and fan-out.", "The dependency graph determines availability: a synchronous chain inherits downstream failures; async flows trade immediacy for resilience.", "Checkout synchronously validates price, then publishes OrderCreated for non-critical fulfillment work."],
  ["REST between services", "REST exposes resource-oriented HTTP contracts with status codes, deadlines, authentication, and versioning.", "It is interoperable and observable, but callers must budget connection setup, serialization, retries, and downstream latency.", { kind: "node", code: "const r = await fetch(url, {\n  signal: AbortSignal.timeout(300),\n  headers: { 'x-request-id': traceId }\n});\nif (!r.ok) throw new Error(`payment: ${r.status}`);" }],
  ["gRPC", "gRPC uses protobuf contracts and HTTP/2 for typed, efficient unary or streaming RPC.", "Generated clients reduce contract drift and multiplexing helps internal traffic, while browser support and debugging are less simple than JSON/HTTP.", "InventoryService.Reserve(ReserveRequest) → ReserveResponse; propagate deadline and trace metadata."],
  ["Message queues", "A queue buffers work so producers and consumers can run at different rates.", "Durable buffering absorbs bursts and isolates availability, but creates backlog, duplication, and delayed-failure concerns.", "OrderCreated → [fulfillment queue] → reserve-inventory workers; scale consumers from queue age, not CPU alone."],
  ["Pub/Sub", "Pub/Sub delivers an event to multiple independent subscriptions.", "Each consumer can evolve and retry independently, enabling fan-out without producer knowledge.", "OrderCreated fans out to analytics, inventory, fraud, and notification subscriptions."],
  ["Event-driven architecture", "Services publish immutable facts and react through explicit event contracts.", "It reduces temporal coupling but moves complexity into schema evolution, lineage, ordering, and eventual convergence.", "OrderCreated v2 { eventId, occurredAt, orderId, customerId, total, schemaVersion }."],
  ["Eventual consistency", "Replicas and services converge after updates rather than participating in one immediate transaction.", "Avoiding global coordination improves availability and throughput, but users and workflows must tolerate stale intermediate states.", "UI shows PAYMENT_PROCESSING until PaymentAuthorized updates the order read model."],
  ["Distributed transactions", "A business operation spans independently durable resources that cannot share a local ACID transaction.", "Two-phase commit adds coordinator and availability constraints; most service systems use local transactions plus messages and compensation.", "Commit order + outbox atomically; relay OrderCreated; payment and inventory commit their own local state."],
  ["Saga pattern", "A saga sequences local transactions and compensating actions through orchestration or choreography.", "It provides business-level recovery without global locks, but compensation is semantic and may not perfectly undo external effects.", "Reserve inventory → authorize payment → confirm order; on failure release stock and void authorization."],
  ["Retry", "Retry only transient failures, within an end-to-end deadline, and only when the operation is safe to repeat.", "Retries can improve availability for brief faults but amplify overload and duplicate side effects.", "Retry 502/503/timeouts up to a budget; do not blindly retry validation failures or an unknown payment outcome."],
  ["Backoff", "Exponential backoff with jitter spreads retries over time.", "Jitter prevents synchronized clients from creating periodic traffic spikes while the dependency recovers.", "delay = random(0, min(cap, base * 2 ** attempt)); stop when request deadline expires."],
  ["Dead-letter queues", "A DLQ quarantines messages that exceed a bounded delivery policy.", "It protects throughput from poison messages while preserving evidence for diagnosis and controlled replay.", "After 5 failures, store payload, eventId, error class, schema version, attempts, and first/last failure timestamps."],
  ["Idempotency", "An idempotent operation produces one business effect for repeated requests with the same identity.", "Networks cannot reliably tell a lost response from a lost request; deduplication makes safe retry possible.", "Insert idempotency_key with a unique constraint in the same transaction as the payment effect; return the stored result."],
  ["Duplicate messages", "At-least-once brokers can redeliver after a consumer commits work but loses its acknowledgement.", "Duplicates are normal delivery behavior, not an exceptional edge case.", "Consumer transaction: claim eventId uniquely, apply state change, record processed event, commit; then acknowledge."],
  ["Ordering", "Ordering is normally guaranteed only within a partition or key, not globally.", "Global ordering serializes throughput; per-aggregate ordering preserves useful causality while retaining parallelism.", "Partition by orderId and reject or defer an event whose aggregate sequence has a gap."],
  ["Observability", "Distributed observability correlates metrics, structured logs, and traces across service and message boundaries.", "A request ID alone cannot explain queue delay or fan-out; context and business identifiers must cross every hop.", "Trace spans: API 40ms → order DB 15ms → queue wait 2.1s → inventory 80ms; alert on queue age and SLO burn."],
  ["Service discovery", "Discovery maps a logical service identity to healthy instances through DNS, registries, or platform services.", "Instances are ephemeral; discovery plus health checks and load balancing prevents hard-coded topology.", "payment.default.svc resolves healthy pods; readiness removes an instance before traffic, while liveness controls restart."],
  ["When microservices are a bad idea", "Microservices are a poor default when boundaries, ownership, scale, and deployment needs are not mature.", "A small team often moves faster with a modular monolith and one transaction boundary.", "Choose a modular monolith for five developers and one release train; extract only after profiling coupling or independent-scale pressure.", { priority: "High" }],
]);

const pipeline = "Order Created → Payment → Inventory → Notification";
const queues = topicsFrom([
  ["Queue vs Pub/Sub", "A queue distributes each job to one consumer group; Pub/Sub gives each subscription its own delivery.", "Choose from delivery semantics: work sharing versus independent fan-out, not from vendor terminology.", `${pipeline}\nQueue: payment workers compete for Order Created.\nPub/Sub: payment, analytics, and fraud each receive Order Created.`],
  ["Producers", "A producer creates a durable event with stable identity, version, timestamp, and partition key.", "Transactional outbox publishing avoids the database-commit/message-publish dual-write gap.", { kind: "node", code: "await db.transaction(async tx => {\n  await tx.orders.insert(order);\n  await tx.outbox.insert({\n    eventId, type: 'OrderCreated.v1', key: order.id, payload\n  });\n});\n// relay publishes outbox rows after commit" }],
  ["Consumers", "A consumer validates, deduplicates, applies a bounded unit of work, and acknowledges only after durable completion.", "Consumer concurrency must respect downstream capacity and ordering boundaries.", `${pipeline}\nPayment consumer validates schema → claims eventId → writes authorization → emits PaymentAuthorized → ack.`],
  ["Acknowledgements", "An acknowledgement transfers responsibility back to the broker after successful durable processing.", "Acknowledging too early loses work; too late increases duplicates. Visibility/lock time must exceed normal processing or be renewed.", "Payment commits authorization and outbox event, then ACKs OrderCreated. A crash before ACK causes safe redelivery."],
  ["Retries", "Retries redeliver transiently failed work with a bounded attempt and time budget.", "Immediate retry during dependency failure consumes capacity and delays healthy messages.", `${pipeline}\nInventory timeout → delayed retry with jitter; invalid SKU → permanent failure route, not retry.`],
  ["Dead-letter queues", "A DLQ stores messages that cannot complete after policy limits or permanent validation failure.", "DLQs need ownership, alarms, diagnosis metadata, retention, and a safe redrive workflow.", "Notification event fails 5 times → DLQ. Fix template, replay by eventId at a controlled rate, verify deduplication."],
  ["Message ordering", "Ordering is scoped to a partition key such as orderId and requires bounded per-key concurrency.", "A global order destroys parallelism; a per-order sequence preserves state transitions.", `${pipeline}\nPartition by orderId: OrderCreated(seq=1) precedes PaymentAuthorized(seq=2); different orders run concurrently.`],
  ["Duplicate messages", "Redelivery occurs when the work commits but its ACK is lost, or when a producer republishes after an uncertain response.", "Consumers must assume duplicates under at-least-once delivery.", "Notification consumer inserts (consumerName,eventId) uniquely before sending; duplicate PaymentAuthorized becomes a no-op."],
  ["At-least-once", "A message is retried until acknowledged, so loss is minimized but duplicate delivery is possible.", "This is the common practical contract for durable brokers and requires idempotent effects.", `${pipeline}\nCrash after inventory commit but before ACK → redelivery → dedupe eventId → ACK.`],
  ["At-most-once", "A message is delivered zero or one time by acknowledging before work or never retrying.", "It avoids duplicates by accepting loss; suitable only where missing work is tolerable or reconstructable.", "Best-effort analytics for OrderCreated may be at-most-once; payment and inventory must not be."],
  ["Exactly-once concepts", "Exactly-once is scoped: a broker may atomically manage its log, while external database, email, and payment effects remain separate.", "End-to-end exactly-once usually means at-least-once delivery plus idempotent, transactional effects.", `${pipeline}\nKafka transaction can atomically consume and publish; it cannot atomically make a third-party payment API forget a duplicate call.`],
  ["Idempotent consumers", "An idempotent consumer stores message identity or enforces the business invariant in the same transaction as its effect.", "A check-then-act outside the transaction races under concurrent duplicate deliveries.", { kind: "node", code: "await db.transaction(async tx => {\n  const claimed = await tx.processed.insertIgnore({ consumer: 'inventory', eventId });\n  if (!claimed) return;\n  await tx.stock.decrementWhereAvailable(orderId, sku, qty);\n  await tx.outbox.insert(inventoryReservedEvent);\n});" }],
  ["Event-driven architecture", "The pipeline is a chain of observable state transitions, not a chain of hidden remote calls.", "Events decouple availability and scaling but demand contract governance, correlation, compensation, and end-to-end lag SLOs.", `${pipeline}\nCorrelate every event with orderId, traceId, causationId, eventId, version, and occurredAt.`],
]);

const systemDesign = topicsFrom([
  ["Requirements gathering", "Clarify actors, workflows, scope, constraints, and success metrics before drawing boxes.", "Architecture is only defensible against explicit requirements and assumptions.", "Ask: daily active users, read/write ratio, geography, retention, payload size, peak factor, compliance, and launch scope."],
  ["Functional requirements", "Functional requirements state user-visible capabilities and system behaviors.", "Prioritizing the core flow prevents designing every possible feature in a 45-minute interview.", "Messaging MVP: send, receive, delivery status, conversation history; defer search and reactions."],
  ["Non-functional requirements", "NFRs quantify latency, throughput, availability, durability, consistency, security, and cost.", "Numbers expose the dominant constraints and make trade-offs testable.", "p99 send latency <300ms, 99.99% durable acceptance, 1B messages/day, 7-year encrypted retention."],
  ["Scalability", "Scalability is maintaining objectives as load grows by partitioning work, removing bottlenecks, and adding capacity.", "Stateless horizontal scaling is useful only if databases and hot keys scale with it.", "Estimate peak QPS, storage growth, bandwidth, and hottest tenant before choosing shards."],
  ["Availability", "Availability is the fraction of intended requests that receive acceptable service.", "Redundancy helps only when failure domains and dependencies are independent.", "Multi-AZ API and database; degrade recommendations during failure while preserving checkout."],
  ["Reliability", "Reliability includes correct, durable operation over time—not just successful HTTP responses.", "Data loss, duplicate billing, and silent corruption can violate reliability while uptime remains green.", "Use invariants, reconciliation, checksums, backups, restore tests, and error budgets."],
  ["Consistency", "Consistency defines which writes a read may observe and in what order.", "Stronger coordination increases latency and reduces availability under partition; choose per invariant.", "Strong consistency for account balance; eventual consistency for product view counts."],
  ["CAP theorem", "During a network partition, a distributed system must choose whether conflicting operations preserve consistency or availability.", "CAP applies under partition and does not eliminate latency, durability, or normal-operation trade-offs.", "Reject a minority-region inventory write for consistency; permit stale catalog reads for availability."],
  ["Load balancing", "A load balancer distributes traffic using health, capacity, locality, and affinity signals.", "Algorithms and health checks affect tail latency and failure recovery.", "Least-outstanding requests with outlier ejection; consistent hashing only where affinity is required."],
  ["Caching", "Caching stores reusable data closer to demand with explicit keys, TTLs, invalidation, and stampede protection.", "It reduces latency and origin load but introduces staleness and another failure mode.", "Cache-aside product reads; versioned key, TTL jitter, request coalescing, and stale-if-error."],
  ["Database scaling", "Scale databases through indexes, query design, replicas, partitioning, and carefully chosen denormalization.", "The database is usually limited by access patterns and hot spots before raw row count.", "Route read-tolerant queries to replicas; shard orders by tenant; isolate hot tenants."],
  ["Queues", "Queues buffer asynchronous work and provide backpressure between components.", "They smooth bursts but queue age adds user-visible latency and can hide an overloaded dependency.", "Accept upload, enqueue scan/transcode, expose status; autoscale on oldest-message age."],
  ["Object storage", "Object storage holds large immutable blobs outside transactional databases.", "It offers cheap durable capacity and direct transfer while metadata and authorization remain in the application.", "Issue short-lived presigned multipart upload; verify checksum; store object key and metadata."],
  ["CDN", "A CDN serves cacheable content from edge locations and shields origins.", "Geographic proximity lowers latency and egress; cache keys and invalidation determine correctness.", "Signed URL for private media; immutable content hash; purge only metadata aliases."],
  ["Monitoring", "Monitoring turns service objectives into metrics, alerts, dashboards, and actionable ownership.", "Alerts should detect user impact through SLO burn, not every internal fluctuation.", "Page on fast/slow error-budget burn; dashboard traffic, errors, duration, saturation, and business throughput."],
  ["Logging", "Structured logs capture discrete diagnostic events with stable fields and controlled cardinality.", "Logs support forensic detail but are expensive and incomplete without correlation and retention policy.", "Log event, service, traceId, tenantId, result, duration; redact secrets and avoid raw payloads."],
  ["Distributed systems", "Distributed systems must handle partial failure, concurrency, clock uncertainty, and message duplication.", "A remote dependency can be slow, partitioned, or ambiguous even when the caller is healthy.", "Use deadlines, idempotency, fencing tokens, quorum/consensus where required, and reconciliation."],
]);

function designProblem(id, title, intro, requirements, apis, schema, architecture, scaling, failures, bottlenecks, tradeoffs, interview) {
  return { id, title, intro, requirements, apis, schema, architecture, scaling, failures, bottlenecks, tradeoffs, interview };
}

const designProblems = [
  designProblem("url-shortener", "URL shortener", "Design redirects optimized for extreme read volume while keeping creation correct and abuse-resistant.",
    ["Create custom or generated aliases", "Redirect with low p99 latency", "Expiration, analytics, and abuse controls"],
    ["POST /v1/links {url, customAlias?, expiresAt?}", "GET /:alias → 301/302", "GET /v1/links/:alias/stats"],
    ["links(alias PK, destination, ownerId, createdAt, expiresAt, status)", "click_events(eventId, alias, timestamp, region, referrer)"],
    ["API generates Base62 IDs or claims custom aliases transactionally", "Cache/edge redirect path; database is source of truth", "Clicks enter an asynchronous analytics stream"],
    ["Partition by alias hash", "Cache hot links at edge with negative-cache care", "Aggregate analytics asynchronously"],
    ["Cache serves a disabled malicious link", "ID generator region failure", "Hot celebrity alias overloads one partition"],
    ["Hot keys and cache misses", "Analytics cardinality and bot traffic"],
    ["301 caches aggressively but is hard to revoke; 302 preserves control", "Random IDs reduce predictability but cost more bytes"],
    ["How do you guarantee custom-alias uniqueness?", "How do deletion and cache invalidation work?"]),
  designProblem("whatsapp-messaging", "WhatsApp-like messaging", "Design durable one-to-one and group messaging with offline delivery and per-device state.",
    ["Send text/media, groups, ordering per conversation", "Offline sync, delivered/read receipts", "End-to-end encryption assumptions"],
    ["WebSocket SendMessage(clientMessageId, conversationId, ciphertext)", "GET /sync?cursor=...", "POST /media/upload-url"],
    ["messages(conversationId, sequence, messageId, senderId, ciphertext)", "device_cursors(deviceId, conversationId, lastSequence)", "memberships(conversationId, userId, role)"],
    ["Gateway maintains connections and authenticates devices", "Sequencer assigns per-conversation order; durable log fans out", "Push notification wakes offline devices; object storage holds media"],
    ["Partition by conversationId; split exceptionally large groups", "Multi-region home routing and async replication", "Batch fan-out and sync"],
    ["Gateway disconnect during send yields ambiguous result", "Offline device falls behind retention", "Membership change races with send"],
    ["Celebrity groups, connection count, receipt fan-out"],
    ["Fan-out-on-write accelerates reads but amplifies large groups", "Strict global ordering is rejected for per-conversation ordering"],
    ["How are duplicates removed across reconnects?", "How do membership and encryption-key rotation interact?"]),
  designProblem("e-commerce", "E-commerce system", "Design catalog, cart, checkout, inventory, order, and payment boundaries around explicit business invariants.",
    ["Browse/search products", "Cart and checkout", "Reserve finite stock and process payment", "Track and cancel orders"],
    ["GET /products?query=", "PUT /carts/:id/items", "POST /orders {cartId,idempotencyKey}", "GET /orders/:id"],
    ["products, sku_inventory(available,reserved,version)", "orders, order_items, payments", "outbox and processed_events"],
    ["Catalog/search read models are eventually consistent", "Checkout orchestrates inventory reservation and payment authorization as a saga", "Order database and outbox commit together"],
    ["Shard orders by customer/tenant", "Partition inventory commands by SKU", "CDN images and cache product reads"],
    ["Payment succeeds but response is lost", "Reservation expires during payment", "Search displays stale price"],
    ["Flash-sale hot SKU, payment dependency, oversized carts"],
    ["Reserve-first avoids oversell but can strand stock", "Strong inventory writes with eventually consistent catalog reads"],
    ["Prevent double charge and oversell.", "Where is the source of truth for price at checkout?"]),
  designProblem("property-listing", "Property listing platform", "Design geo-search and listing ingestion where freshness, ranking, and fraud controls matter.",
    ["Create/update listings and media", "Geo/bounding-box search with filters", "Saved searches and lead contact"],
    ["POST /listings", "GET /search?bbox=&priceMin=&beds=", "POST /saved-searches", "POST /listings/:id/leads"],
    ["listings(id, ownerId, geo, price, attributes, status, version)", "listing_media", "saved_searches", "leads"],
    ["Transactional listing store emits change events", "Search index provides geo/filter queries", "Media uses direct object upload and CDN"],
    ["Partition search geographically", "Precompute map clusters", "Incremental index updates with reconciliation"],
    ["Search index misses an update", "Duplicate syndication import", "Fraudulent listing spreads through feeds"],
    ["Dense-city geo tiles, filter combinations, image processing"],
    ["Search freshness versus write latency", "Denormalized index enables queries but requires repair"],
    ["How do you reconcile source DB and index?", "How do pagination and map movement avoid duplicates?"]),
  designProblem("notification-system", "Notification system", "Design policy-aware email, SMS, push, and in-app delivery without duplicate or uncontrolled sends.",
    ["Templates and localization", "Preferences, quiet hours, priorities", "Scheduling, retries, provider failover, delivery status"],
    ["POST /notifications {idempotencyKey,template,recipient,channels}", "PUT /users/:id/preferences", "GET /notifications/:id"],
    ["notifications, attempts, templates(versioned)", "preferences(userId, channel, category)", "provider_callbacks(providerMessageId,status)"],
    ["Request persists intent and enqueues channel jobs", "Policy service resolves preferences; workers render and send", "Callbacks update status; reconciliation handles missing callbacks"],
    ["Partition by recipient to enforce rate/order", "Provider-specific pools and circuit breakers", "Batch low-priority sends"],
    ["Provider accepts request but times out", "Bad template creates retry storm", "Quiet-hours timezone changes"],
    ["Celebrity fan-out, provider quotas, template rendering"],
    ["Failover can duplicate sends; transactional providers need stable idempotency", "Priority isolation costs capacity"],
    ["How do you stop a campaign immediately?", "How are provider callbacks authenticated and deduplicated?"]),
  designProblem("file-upload", "File upload system", "Design secure large-file ingestion, processing, and download without proxying bytes through application servers.",
    ["Multipart/resumable upload", "Virus scan and metadata extraction", "Authorized download, lifecycle, deletion"],
    ["POST /uploads → uploadId + signed part URLs", "POST /uploads/:id/complete", "GET /files/:id/download-url"],
    ["files(id, ownerId, objectKey, size, checksum, state)", "upload_parts(uploadId,part,etag)", "processing_jobs"],
    ["Control plane authorizes and signs direct object-store transfers", "Completion verifies size/checksum and enqueues scan", "Only CLEAN files receive download tokens"],
    ["Multipart parallelism, CDN downloads, lifecycle tiers", "Queue-based processing with per-tenant quotas"],
    ["Client claims completion with missing parts", "Scanner outage builds backlog", "Delete races with active download"],
    ["Huge files, decompression bombs, orphaned multipart uploads"],
    ["Presigned URLs reduce server load but constrain validation timing", "Synchronous scanning is safer but harms availability"],
    ["How do resumability and integrity work?", "How do you guarantee quarantine before download?"]),
  designProblem("payment-system", "Payment system", "Design a ledger-centered payment service for idempotent authorization, capture, refund, and reconciliation.",
    ["Authorize/capture/refund", "Immutable audit trail and merchant balance", "Webhooks and reconciliation"],
    ["POST /payments with Idempotency-Key", "POST /payments/:id/captures", "POST /payments/:id/refunds", "GET /payments/:id"],
    ["payment_intents, provider_attempts", "ledger_entries(transactionId,account,debit,credit)", "idempotency_records, outbox"],
    ["State machine controls legal transitions", "Double-entry ledger commits atomically with payment state", "Provider adapter and reconciliation resolve ambiguous outcomes"],
    ["Partition merchants while preserving ledger transaction locality", "Isolate provider pools and rate limits", "Read models serve reporting"],
    ["Provider accepts capture but response is lost", "Webhook arrives before API response", "Partial refund races with full refund"],
    ["Hot merchants, provider latency, reconciliation volume"],
    ["Availability yields to financial correctness", "Provider abstraction helps failover but cannot erase provider semantics"],
    ["How do you prevent double charge?", "How does reconciliation repair unknown states?"]),
  designProblem("product-sync", "Product synchronization system", "Design ingestion and convergence of product data across a source of truth, search, marketplaces, and caches.",
    ["Import create/update/delete", "Schema mapping and validation", "Near-real-time propagation with replay and audit"],
    ["POST /imports", "PUT /products/:externalId", "GET /sync-jobs/:id", "POST /destinations/:id/replay"],
    ["products(id, sourceVersion, canonicalData)", "destination_state(productId,destination,version,status)", "sync_events"],
    ["Normalize source changes into versioned canonical events", "Destination consumers upsert conditionally by version", "Periodic reconciliation detects drift"],
    ["Partition by productId to preserve order", "Destination-specific queues and quotas", "Bulk snapshot plus change-data-capture tail"],
    ["Older event arrives after newer", "Destination throttles for hours", "Mapping bug corrupts many products"],
    ["Large catalog snapshots, hot bulk edits, API quotas"],
    ["One canonical model simplifies consumers but may lose destination nuance", "Replayability requires immutable history and storage"],
    ["How do you prevent stale overwrites?", "How do snapshot and incremental streams join safely?"]),
  designProblem("webhook-processing", "Webhook processing system", "Design fast, authenticated ingestion and reliable asynchronous processing of third-party callbacks.",
    ["Verify authenticity and reject replay", "Respond quickly, deduplicate, route, retry, and replay", "Preserve raw evidence"],
    ["POST /webhooks/:provider", "GET /deliveries/:id", "POST /deliveries/:id/replay"],
    ["deliveries(provider,eventId,payloadHash,receivedAt,status)", "attempts(deliveryId,consumer,attempt,error)", "secrets(provider,version)"],
    ["Edge verifies signature against raw bytes and timestamp", "Persist then acknowledge; queue dispatches normalized events", "Consumers dedupe and use DLQ/redrive"],
    ["Partition by provider/tenant with fairness", "Archive payloads to object storage", "Autoscale on oldest-message age"],
    ["Provider retries before first request commits", "Secret rotates during delivery", "Poison event blocks a partition"],
    ["Burst traffic, signature CPU, noisy tenants"],
    ["Acknowledge after persistence, not full processing", "Ordering per entity costs parallelism"],
    ["Why must signature verification use raw bytes?", "How do you replay without repeating side effects?"]),
  designProblem("real-time-chat", "Real-time chat system", "Design low-latency rooms with presence, typing, history, reconnect, and abuse protection.",
    ["Rooms and direct chat", "Ordered messages and history", "Presence/typing, reconnect, moderation"],
    ["WebSocket Authenticate/Join/Send(clientMessageId)", "GET /rooms/:id/messages?before=", "POST /rooms/:id/moderation"],
    ["messages(roomId,sequence,messageId,author,body)", "memberships", "connection_presence(userId,gateway,expiresAt)"],
    ["Gateways own connections and publish room traffic", "Per-room sequencer/durable log stores messages", "Presence is ephemeral with TTL; history store is durable"],
    ["Consistent-hash rooms or use broker fan-out across gateways", "Shard history by roomId", "Separate presence traffic from messages"],
    ["Reconnect repeats send", "Gateway partition leaves ghost presence", "Large room overwhelms fan-out"],
    ["Mega-rooms, connection memory, slow clients"],
    ["Durable chat messages but lossy typing indicators", "Server ordering adds a hop but creates a canonical sequence"],
    ["How do clients fill gaps after reconnect?", "How do you isolate slow consumers and mega-rooms?"]),
];

const performance = topicsFrom([
  ["Slow API", "Slow APIs require decomposition of queueing, application, dependency, database, and network time by percentile.", "Latency is a distribution; p50 can look healthy while p99 violates the SLO.", "Compare p50/p95/p99 traces; separate 2s queue wait from 40ms CPU and 300ms database.", { exercise: "Use a trace waterfall to form and test three hypotheses; define an SLO and rollback trigger." }],
  ["High CPU", "High CPU can come from useful load, hot loops, serialization, regex, crypto, GC, or excessive context switching.", "CPU saturation increases queueing nonlinearly; adding instances masks but does not identify the cause.", "Capture an on-CPU profile during the event; compare flamegraph and requests/sec to a healthy baseline."],
  ["High memory", "High memory may be live working set, buffers, cache, native allocations, fragmentation, or retained garbage.", "RSS, heap used, external memory, and GC behavior answer different questions.", "Track process.memoryUsage(), heap snapshots, allocation profiles, GC pause, and container working set."],
  ["Memory leaks", "A leak is unintended retention: live objects remain reachable, so the heap baseline rises after GC.", "A single snapshot shows size, not growth; compare dominator trees across controlled intervals.", "Take snapshots after warm-up and repeated load; inspect growing retainers such as Map, listeners, timers, or closures."],
  ["Event-loop blocking", "Long synchronous callbacks delay every timer, socket, and request on that Node.js thread.", "Low CPU average can hide periodic 500ms blocks that dominate tail latency.", { kind: "node", code: "const { monitorEventLoopDelay } = require('node:perf_hooks');\nconst h = monitorEventLoopDelay({ resolution: 20 });\nh.enable();\nsetInterval(() => console.log('p99 ms', h.percentile(99) / 1e6), 5000);" }],
  ["Slow database queries", "Diagnose query shape, execution plan, cardinality estimates, indexes, locks, I/O, and returned row volume.", "An index is useful only when it matches predicates, joins, ordering, and selectivity.", "Use EXPLAIN ANALYZE on a captured slow query; verify scanned versus returned rows and production-like parameters."],
  ["Connection pool exhaustion", "A pool saturates when requests hold connections longer than capacity can replenish them.", "Increasing pool size can overload the database and worsen queueing; the root issue may be slow queries, leaks, or transactions.", "Graph active, idle, pending, acquire latency, transaction duration, and DB max connections together."],
  ["Too many API requests", "Request amplification comes from polling, retries, chatty service boundaries, duplicate UI effects, or missing batching/cache.", "Reducing request count often improves latency and capacity more than micro-optimizing handlers.", "Correlate user action → frontend calls → internal fan-out; add request coalescing, pagination, batching, or event push."],
  ["N+1 queries", "N+1 performs one parent query and one child query per row instead of a bounded set.", "Round trips and repeated planning dominate even when each individual query is fast.", "Replace 101 queries for 100 orders with a join, batched IN query, or request-scoped DataLoader; preserve pagination semantics."],
  ["Slow frontend/backend communication", "Browser latency includes DNS, connection/TLS, request upload, server time, response download, parsing, and main-thread work.", "Server traces alone omit geographic RTT, payload, CORS preflight, and browser scheduling.", "Use Resource Timing and Server-Timing; compare TTFB, transfer size, protocol reuse, compression, and region."],
  ["Queue backlog", "Backlog grows when arrival rate exceeds effective completion rate; oldest-message age measures user impact.", "Queue depth alone is ambiguous because message sizes and processing times vary.", "Track enqueue/completion rate, oldest age, retries, per-message duration, and downstream saturation; shed or prioritize safely."],
  ["Failed jobs", "Failed jobs need classification into transient, permanent, poison-data, dependency, and code defects.", "One retry policy cannot correctly handle all classes and may hide permanent failure.", "Store error class and attempt metadata; alert on rate; quarantine permanent failures; replay after a verified fix."],
  ["Retry storms", "A retry storm is positive feedback: failures trigger extra traffic, which prevents recovery and triggers more retries.", "Retries consume the same constrained capacity as original work.", "Use capped exponential backoff with jitter, retry budgets, circuit breakers, deadlines, and load shedding."],
  ["Race conditions", "A race occurs when correctness depends on uncontrolled interleaving of concurrent operations.", "Node.js single-threaded JavaScript does not make multi-request or multi-process read-modify-write atomic.", "Use an atomic conditional update: UPDATE stock SET qty=qty-1 WHERE sku=? AND qty>=1; verify affected rows."],
  ["Deadlocks", "A deadlock is a cycle of transactions each waiting for a lock held by another.", "The database must abort a victim; applications should minimize cycles and safely retry bounded transactions.", "Lock rows in a consistent order, keep transactions short, inspect deadlock graphs, and retry only the aborted transaction."],
  ["API 500ms→10s debug runbook", "Treat a sudden latency regression as an incident: stabilize first, preserve evidence, then isolate the changed bottleneck.", "A disciplined runbook prevents random restarts from destroying evidence or shifting load into a failing dependency.", "0–5m: confirm SLO impact and scope; freeze deploys.\n5–10m: compare p50/p99, traffic, errors, saturation, queue age.\n10–20m: inspect traces and recent changes; identify queue vs CPU vs DB vs dependency.\nMitigate: rollback, shed load, disable feature, cap retries, or fail over.\nRecover: verify burn rate and backlog drain.\nFollow-up: timeline, root cause, tests, capacity and alert fixes.", {
    id: "api-latency-incident-runbook",
    mistakes: ["Restarting every instance before collecting profiles, traces, and saturation evidence.", "Scaling callers while a database or dependency is already saturated.", "Declaring recovery when latency drops but the queue backlog is still growing."],
    interview: ["An API moved from 500ms to 10s. What do you do in the first 15 minutes?", "How do you distinguish queueing, CPU, database, and dependency latency?"],
    answers: ["First confirm user impact and blast radius, assign incident roles, stop risky changes, and compare golden signals and percentiles with a healthy baseline. Use traces to locate where the extra 9.5 seconds lives.", "Queueing shows wait/saturation and concurrency pressure; CPU shows profile hotspots/event-loop lag; DB shows acquire/query/lock time; dependencies show child-span latency and timeout/error shifts."],
    senior: ["When do you roll back versus continue diagnosis?", "What evidence must survive the incident?"],
    seniorAnswers: ["Roll back early when timing and scope implicate a reversible deploy and rollback risk is lower than ongoing SLO burn. Mitigate independently if rollback cannot repair state or dependency overload.", "Preserve deploy/config timeline, dashboards, representative traces, logs, profiles, query plans, queue metrics, mitigation decisions, and exact recovery criteria."],
    exercise: "Run a tabletop incident. Produce a 15-minute timeline, three falsifiable hypotheses, a mitigation decision, recovery checks, and five post-incident actions.",
  }],
]);

const pages = [
  {
    file: "09-microservices.html",
    id: "09",
    title: "Microservices",
    kicker: "Phase 09 · Distributed architecture",
    lead: "Choose service boundaries and communication semantics deliberately, then design for partial failure, duplication, and operational ownership.",
    topics: microservices,
    prev: { file: "08-auth-security.html", title: "Auth & Security" },
    next: { file: "10-queues.html", title: "Queues" },
  },
  {
    file: "10-queues.html",
    id: "10",
    title: "Queues & Event-Driven Systems",
    kicker: "Phase 10 · Asynchronous workflows",
    lead: `Reason about delivery through one production pipeline: <strong>${pipeline}</strong>. Every stage must tolerate retries, duplicates, delay, and partial failure.`,
    topics: queues,
    prev: { file: "09-microservices.html", title: "Microservices" },
    next: { file: "11-system-design.html", title: "System Design" },
  },
  {
    file: "11-system-design.html",
    id: "11",
    title: "System Design",
    kicker: "Phase 11 · Architecture interviews",
    lead: "Start with requirements and estimates, define invariants and SLOs, then evolve the design around bottlenecks and failure modes.",
    topics: systemDesign,
    designProblems,
    prev: { file: "10-queues.html", title: "Queues" },
    next: { file: "12-performance.html", title: "Performance" },
  },
  {
    file: "12-performance.html",
    id: "12",
    title: "Performance & Production Debugging",
    kicker: "Phase 12 · Diagnosis and incidents",
    lead: "Debug from evidence: quantify the regression, locate queueing and saturation, mitigate safely, and verify recovery against user-facing objectives.",
    topics: performance,
    prev: { file: "11-system-design.html", title: "System Design" },
    next: { file: "13-docker.html", title: "Docker" },
  },
];

function validatePage(page) {
  const topicFields = ["id", "title", "priority", "concept", "why", "example", "mistakes", "interview", "answers", "senior", "seniorAnswers", "exercise"];
  for (const item of page.topics) {
    for (const field of topicFields) {
      if (item[field] === undefined) throw new Error(`${page.id}/${item.id}: missing ${field}`);
    }
  }
  for (const problem of page.designProblems || []) {
    for (const field of ["id", "title", "intro", "requirements", "apis", "schema", "architecture", "scaling", "failures", "bottlenecks", "tradeoffs", "interview"]) {
      if (problem[field] === undefined) throw new Error(`${page.id}/${problem.id}: missing ${field}`);
    }
  }
}

fs.mkdirSync(phasesDir, { recursive: true });
for (const page of pages) {
  validatePage(page);
  const output = phasePage(page);
  fs.writeFileSync(path.join(phasesDir, page.file), output);
  console.log(`${page.file}: ${page.topics.length} topics, ${(page.designProblems || []).length} design problems`);
}
