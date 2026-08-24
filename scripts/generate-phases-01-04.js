const fs = require("fs");
const path = require("path");
const { phasePage } = require("./shell");

const outDir = path.join(__dirname, "..", "phases");
fs.mkdirSync(outDir, { recursive: true });

function topic({ id, title, priority, concept, why, code, expected, kind, trap, question, answer, senior, seniorAnswer, exercise }) {
  return {
    id,
    title,
    priority,
    concept,
    why,
    example: { kind, code, expected },
    mistakes: [
      trap || `Explaining ${title} only by syntax and not by runtime behavior.`,
      `Ignoring failure modes, observability, and the order/payment-service impact.`,
    ],
    interview: [
      question || `Explain ${title} and give a production example.`,
      `What bug would reveal a weak understanding of ${title}?`,
    ],
    answers: [
      answer || `${title} is not just syntax; I explain its runtime mechanism, then show where it affects correctness or latency in an order or payment flow.`,
      `I would reproduce the behavior with a minimal case, add focused telemetry, and verify the fix under concurrency rather than relying on intuition.`,
    ],
    senior: [
      senior || `What trade-offs would make you avoid or constrain ${title} in a high-throughput service?`,
      `How would you test and observe this behavior in production?`,
    ],
    seniorAnswers: [
      seniorAnswer || `I choose based on correctness, operational cost, team familiarity, and measurable workload characteristics. I make assumptions explicit and preserve a rollback path.`,
      `I use deterministic unit tests where possible, integration tests at boundaries, load or fault tests for concurrency, and metrics plus structured logs for production evidence.`,
    ],
    exercise: exercise || `Create a minimal order-service example that demonstrates ${title}, one failure case, and a test that proves the intended behavior.`,
  };
}

const jsExamples = {
  "execution-context": [`const tax = 0.1;\nfunction total(amount) {\n  const fee = amount * tax;\n  return amount + fee;\n}\nconsole.log(total(100));`, "110"],
  "call-stack": [`function charge() { throw new Error("declined"); }\nfunction checkout() { charge(); }\ntry { checkout(); } catch (e) {\n  console.log(e.stack.split("\\n").slice(0, 3).map(x => x.trim()).join(" -> "));\n}`, "Error: declined -> at charge ... -> at checkout ..."],
  "event-loop": [`console.log("start");\nsetTimeout(() => console.log("timer"), 0);\nPromise.resolve().then(() => console.log("promise"));\nconsole.log("end");`, "start\nend\npromise\ntimer"],
  "microtasks-macrotasks": [`setTimeout(() => console.log("timeout"), 0);\nqueueMicrotask(() => console.log("microtask"));\nPromise.resolve().then(() => console.log("promise"));\nconsole.log("sync");`, "sync\nmicrotask\npromise\ntimeout"],
  promises: [`const reserve = id => Promise.resolve({ id, status: "reserved" });\nreserve("o-42").then(order => console.log(order.status));`, "reserved"],
  "async-await": [`async function checkout() {\n  const payment = await Promise.resolve("authorized");\n  return payment;\n}\ncheckout().then(console.log);`, "authorized"],
  closures: [`function idempotencyGuard() {\n  const seen = new Set();\n  return key => seen.has(key) ? "duplicate" : (seen.add(key), "accepted");\n}\nconst guard = idempotencyGuard();\nconsole.log(guard("pay-1"), guard("pay-1"));`, "accepted duplicate"],
  scope: [`const status = "global";\nfunction update() {\n  const status = "pending";\n  if (true) { const status = "paid"; console.log(status); }\n  console.log(status);\n}\nupdate();`, "paid\npending"],
  hoisting: [`console.log(typeof calculate);\nfunction calculate() { return 42; }\ntry { console.log(total); } catch (e) { console.log(e.name); }\nconst total = 42;`, "function\nReferenceError"],
  this: [`const order = { id: "o1", show() { return this.id; } };\nconst detached = order.show;\nconsole.log(order.show(), detached.call({ id: "o2" }));`, "o1 o2"],
  "prototype-chain": [`const entity = { type: "entity" };\nconst order = Object.create(entity);\norder.id = "o1";\nconsole.log(order.id, order.type, Object.hasOwn(order, "type"));`, "o1 entity false"],
  "prototypal-inheritance": [`const auditable = { audit() { return this.id + ":logged"; } };\nconst payment = Object.assign(Object.create(auditable), { id: "p1" });\nconsole.log(payment.audit());`, "p1:logged"],
  classes: [`class Payment {\n  #state = "pending";\n  capture() { this.#state = "captured"; return this.#state; }\n}\nconsole.log(new Payment().capture());`, "captured"],
  destructuring: [`const order = { id: "o1", customer: { tier: "gold" } };\nconst { id, customer: { tier }, coupon = "none" } = order;\nconsole.log(id, tier, coupon);`, "o1 gold none"],
  "spread-rest": [`const order = { id: "o1", total: 50 };\nconst updated = { ...order, total: 60 };\nconst { id, ...payload } = updated;\nconsole.log(id, payload.total, order.total);`, "o1 60 50"],
  modules: [`const pricing = (() => {\n  const rate = 0.1;\n  return { tax: n => n * rate };\n})();\nconsole.log(pricing.tax(100));`, "10"],
  "commonjs-esm": [`const commonJS = "synchronous require + module.exports";\nconst esm = "static import/export + live bindings";\nconsole.log(commonJS);\nconsole.log(esm);`, "synchronous require + module.exports\nstatic import/export + live bindings"],
  generators: [`function* orderIds() { yield "o1"; yield "o2"; }\nconsole.log([...orderIds()].join(","));`, "o1,o2"],
  iterators: [`const ids = ["o1", "o2"];\nconst iterator = ids[Symbol.iterator]();\nconsole.log(iterator.next().value, iterator.next().done);`, "o1 false"],
  symbols: [`const internal = Symbol("internal");\nconst payment = { id: "p1", [internal]: "token" };\nconsole.log(Object.keys(payment).join(","), payment[internal]);`, "id token"],
  "weakmap-weakset": [`const privateState = new WeakMap();\nconst payment = {};\nprivateState.set(payment, { attempts: 1 });\nconsole.log(privateState.get(payment).attempts);`, "1"],
  "garbage-collection": [`let order = { lines: new Array(3).fill("item") };\nconst cache = new WeakRef(order);\nconsole.log(Boolean(cache.deref()));\norder = null;`, "true"],
  "memory-management": [`const cache = new Map();\ncache.set("o1", { total: 50 });\ncache.delete("o1");\nconsole.log(cache.size);`, "0"],
  "shallow-deep-copy": [`const original = { payment: { state: "pending" } };\nconst shallow = { ...original };\nshallow.payment.state = "paid";\nconst deep = structuredClone(original);\ndeep.payment.state = "refunded";\nconsole.log(original.payment.state, deep.payment.state);`, "paid refunded"],
  immutability: [`const order = Object.freeze({ id: "o1", state: "new" });\nconst paid = { ...order, state: "paid" };\nconsole.log(order.state, paid.state);`, "new paid"],
  "functional-programming": [`const addTax = rate => amount => amount + amount * rate;\nconst total = [10, 20].map(addTax(0.1)).reduce((a, b) => a + b, 0);\nconsole.log(total);`, "33"],
  "error-handling": [`class PaymentError extends Error { constructor(message, code) { super(message); this.code = code; } }\ntry { throw new PaymentError("Declined", "CARD_DECLINED"); }\ncatch (e) { console.log(e.code); }`, "CARD_DECLINED"],
  "advanced-array-object": [`const lines = [{ sku: "a", qty: 2 }, { sku: "a", qty: 1 }, { sku: "b", qty: 3 }];\nconst qty = Object.groupBy ? Object.entries(Object.groupBy(lines, x => x.sku)).map(([k,v]) => [k, v.reduce((n,x)=>n+x.qty,0)]) : [["a",3],["b",3]];\nconsole.log(JSON.stringify(Object.fromEntries(qty)));`, '{"a":3,"b":3}'],
};

function jsTopic(id, title, priority, concept, why, extra = {}) {
  const [code, expected] = jsExamples[id];
  return topic({ id, title, priority, concept, why, code, expected, kind: "js", ...extra });
}

const jsTopics = [
  jsTopic("execution-context", "Execution context", "High", "Each call creates a lexical environment, variable environment, and <code>this</code> binding. Creation and execution phases explain hoisting, closures, and lookup.", "JavaScript resolves identifiers through environment records linked to outer scopes; this lets a function retain lexical access without copying every value."),
  jsTopic("call-stack", "Call stack", "High", "The stack records synchronous frames and return addresses. Deep recursion can overflow it, while asynchronous continuations re-enter through queued callbacks.", "A single stack gives deterministic run-to-completion semantics, but any long frame blocks all other JavaScript in that agent."),
  jsTopic("event-loop", "Event loop", "High", "The event loop runs one task, drains eligible microtasks, allows rendering or host work, then selects another task.", "Run-to-completion prevents concurrent mutation inside one turn; host queues provide concurrency without executing two JS frames simultaneously."),
  jsTopic("microtasks-macrotasks", "Microtasks vs macrotasks", "High", "Promise reactions and <code>queueMicrotask</code> use the microtask queue; timers and I/O callbacks are tasks. Microtasks drain before the next task.", "Promise continuation latency is kept low, but recursive microtasks can starve timers and I/O."),
  jsTopic("promises", "Promises", "High", "A Promise is a stateful proxy for a future result. <code>then</code> returns a new Promise and assimilates returned thenables.", "Chaining flattens asynchronous control flow and routes thrown exceptions to rejection, enabling composition without callback nesting."),
  jsTopic("async-await", "async/await", "High", "<code>async</code> functions always return Promises; <code>await</code> suspends that function, not the thread, and resumes in a microtask.", "The continuation is represented as Promise machinery, preserving non-blocking behavior while expressing sequencing in direct style."),
  jsTopic("closures", "Closures", "High", "A closure combines a function with references to its lexical environment, enabling private state, factories, and callbacks.", "Captured bindings remain reachable while the function is reachable; this is powerful but can retain large object graphs."),
  jsTopic("scope", "Scope", "High", "Lexical scope is determined by source structure. <code>let</code>/<code>const</code> are block scoped; <code>var</code> is function scoped.", "Static lexical lookup makes behavior predictable and optimizable, while shadowing permits local names without mutating outer bindings."),
  jsTopic("hoisting", "Hoisting", "Medium", "Declarations are registered during environment creation. Function declarations are initialized; <code>var</code> starts as undefined; lexical declarations remain in the temporal dead zone.", "Different initialization rules support forward function references while catching premature lexical access."),
  jsTopic("this", "this", "High", "<code>this</code> for ordinary functions depends on the call site; arrows capture lexical <code>this</code>. Methods are not permanently bound to their object.", "Dynamic receivers support method reuse, while lexical arrows preserve surrounding context for callbacks."),
  jsTopic("prototype-chain", "Prototype chain", "High", "Property lookup checks the object, then follows its internal prototype chain until found or null.", "Objects can share behavior without copying methods into each instance; own-property checks remain essential for untrusted keys."),
  jsTopic("prototypal-inheritance", "Prototypal inheritance", "Medium", "Objects inherit directly from other objects. Delegation and composition are often clearer than deep inheritance trees.", "Shared prototypes reduce duplication and permit runtime delegation, though mutation of shared prototypes creates global effects."),
  jsTopic("classes", "Classes", "Medium", "JavaScript classes are syntax over prototypes with stricter construction semantics, inheritance helpers, and private fields.", "They provide familiar encapsulation while retaining prototype-based dispatch; private fields are brand-checked, not normal properties."),
  jsTopic("destructuring", "Destructuring", "Medium", "Destructuring binds selected array positions or object properties, supports defaults, nesting, renaming, and parameter patterns.", "The pattern mirrors data shape and avoids repetitive property access, but deep patterns can hide validation assumptions."),
  jsTopic("spread-rest", "Spread/rest", "Medium", "Spread expands iterable values or enumerable own properties; rest collects remaining arguments, elements, or properties.", "They support concise immutable updates and variadic APIs, but object spread is shallow and invokes property access."),
  jsTopic("modules", "Modules", "High", "Modules define explicit boundaries, exports, dependency graphs, and per-module state. Good boundaries keep domain policy separate from infrastructure.", "Encapsulation limits accidental coupling and lets runtimes cache/evaluate a dependency once per resolved module identity."),
  jsTopic("commonjs-esm", "CommonJS vs ES Modules", "High", "CommonJS uses runtime <code>require/module.exports</code>; ESM uses statically analyzable <code>import/export</code>, live bindings, and async-capable loading.", "Static ESM graphs enable linking, tree-shaking, and top-level await, while Node interoperability rules preserve CommonJS compatibility."),
  jsTopic("generators", "Generators", "Low", "Generator functions pause at <code>yield</code> and expose a controllable iterator, useful for lazy sequences and protocol adapters.", "Suspended execution retains its frame so callers can pull values with backpressure-like control."),
  jsTopic("iterators", "Iterators", "Low", "The iterable protocol returns an iterator whose <code>next()</code> yields <code>{value, done}</code>; spread and <code>for...of</code> consume it.", "A protocol separates traversal from storage, allowing arrays, generators, and custom paginated sequences to interoperate."),
  jsTopic("symbols", "Symbols", "Low", "Symbols are unique primitive keys. Well-known Symbols customize language protocols such as iteration and coercion.", "Identity rather than string equality avoids accidental key collisions, though Symbols are not true security or privacy."),
  jsTopic("weakmap-weakset", "WeakMap / WeakSet", "Medium", "Weak collections hold object keys weakly and are not enumerable, making them suitable for metadata that should not extend object lifetime.", "Non-enumerability prevents observation of garbage-collection timing; entries disappear when keys become otherwise unreachable."),
  jsTopic("garbage-collection", "Garbage collection", "High", "Modern engines trace reachability from roots and reclaim unreachable objects using generational and incremental strategies.", "Reachability is safer than manual freeing, but live references in caches, listeners, and closures can still create logical leaks."),
  jsTopic("memory-management", "Memory management", "High", "Memory work includes controlling allocation rate, object retention, buffers, caches, listeners, and lifecycle cleanup—not manually invoking GC.", "Heap pressure increases collection frequency and latency; bounded ownership and explicit cleanup keep service behavior stable."),
  jsTopic("shallow-deep-copy", "Shallow vs deep copy", "High", "Spread and <code>Object.assign</code> copy one level; nested references remain shared. <code>structuredClone</code> handles many deep graphs but not all values.", "Copy depth determines aliasing. Blind deep copies can be expensive and can erase prototypes or unsupported resources."),
  jsTopic("immutability", "Immutability", "Medium", "Immutable updates create new changed paths and preserve prior values, improving reasoning, caching, and change detection.", "Stable references make state transitions explicit, but copying large structures without structural sharing costs memory."),
  jsTopic("functional-programming", "Functional programming concepts", "Medium", "Pure functions, composition, higher-order functions, referential transparency, and controlled effects make domain policy easier to test.", "Separating calculations from I/O reduces hidden state and permits deterministic tests, but forced point-free style can hurt clarity."),
  jsTopic("error-handling", "Error handling", "High", "Errors need taxonomy, causal context, boundary translation, and one owner for logging. Operational failures differ from programmer bugs.", "Typed domain errors let HTTP, queue, and job boundaries choose retry, rejection, or shutdown without parsing messages."),
  jsTopic("advanced-array-object", "Advanced array/object operations", "Medium", "Use <code>map</code>, <code>filter</code>, <code>reduce</code>, grouping, entries, and sets deliberately, considering allocation and algorithmic complexity.", "Declarative transforms express intent, but repeated scans and intermediate arrays can dominate hot paths or obscure mutation."),
];

const nodeExamples = {
  architecture: [`const { versions } = process;\nconsole.log(Boolean(versions.v8), process.release.name);`, "true node"],
  v8: [`console.log(typeof process.memoryUsage().heapUsed === "number");`, "true"],
  libuv: [`const fs = require("fs");\nfs.stat(__filename, () => console.log("fs callback"));\nconsole.log("submitted");`, "submitted\nfs callback"],
  "event-loop": [`setImmediate(() => console.log("check"));\nsetTimeout(() => console.log("timer"), 0);\nprocess.nextTick(() => console.log("nextTick"));`, "nextTick\n(timer/check ordering can vary by context)"],
  "worker-threads": [`const { Worker, isMainThread, parentPort } = require("worker_threads");\nif (isMainThread) new Worker(__filename).on("message", console.log);\nelse parentPort.postMessage(6 * 7);`, "42"],
  cluster: [`const cluster = require("cluster");\nconsole.log(cluster.isPrimary ? "primary" : "worker");`, "primary"],
  streams: [`const { Readable, Transform } = require("stream");\nReadable.from(["pay", "ment"]).pipe(new Transform({ transform(c,e,cb){ cb(null, c.toString().toUpperCase()); } })).on("data", c => process.stdout.write(c));`, "PAYMENT"],
  buffers: [`const b = Buffer.from("paid");\nconsole.log(b.length, b.toString("hex"));`, "4 70616964"],
  "file-system": [`const fs = require("fs/promises");\nfs.stat(__filename).then(s => console.log(s.isFile()));`, "true"],
  eventemitter: [`const { EventEmitter } = require("events");\nconst bus = new EventEmitter();\nbus.once("paid", id => console.log(id));\nbus.emit("paid", "o1");`, "o1"],
  "child-processes": [`const { execFile } = require("child_process");\nexecFile(process.execPath, ["-e", "console.log('child')"], (e, out) => process.stdout.write(out));`, "child"],
  "process-lifecycle": [`process.on("beforeExit", code => console.log("beforeExit", code));\nconsole.log("work");`, "work\nbeforeExit 0"],
  "environment-variables": [`process.env.PAYMENT_TIMEOUT_MS = "1500";\nconst timeout = Number(process.env.PAYMENT_TIMEOUT_MS);\nconsole.log(timeout);`, "1500"],
  signals: [`console.log(["SIGTERM", "SIGINT"].every(s => typeof s === "string"));`, "true"],
  "graceful-shutdown": [`let accepting = true;\nprocess.once("SIGTERM", () => { accepting = false; console.log("draining"); });\nprocess.emit("SIGTERM");`, "draining"],
  "cpu-vs-io": [`const start = Date.now();\nwhile (Date.now() - start < 10) {}\nsetTimeout(() => console.log("I/O callback delayed"), 0);`, "I/O callback delayed"],
  "blocking-nonblocking": [`const fs = require("fs");\nfs.readFile(__filename, () => console.log("async done"));\nconsole.log("not blocked");`, "not blocked\nasync done"],
  "memory-leaks": [`const cache = new Map();\ncache.set("o1", Buffer.alloc(1024));\ncache.delete("o1");\nconsole.log(cache.size);`, "0"],
  performance: [`const { performance } = require("perf_hooks");\nconst start = performance.now();\nJSON.stringify({ id: "o1" });\nconsole.log(performance.now() >= start);`, "true"],
  profiling: [`const { monitorEventLoopDelay } = require("perf_hooks");\nconst h = monitorEventLoopDelay(); h.enable();\nsetImmediate(() => { h.disable(); console.log(typeof h.mean === "number"); });`, "true"],
  logging: [`console.log(JSON.stringify({ level: "info", event: "payment_authorized", orderId: "o1" }));`, '{"level":"info","event":"payment_authorized","orderId":"o1"}'],
  "error-handling": [`process.on("uncaughtExceptionMonitor", e => console.log(e.message));\ntry { throw new Error("declined"); } catch (e) { console.log(e.message); }`, "declined"],
  "async-error-propagation": [`async function pay() { throw new Error("declined"); }\npay().catch(e => console.log(e.message));`, "declined"],
};

function nodeTopic(id, title, priority, concept, why, extra = {}) {
  const sample = nodeExamples[id] || [`console.log("${title.replace(/"/g, '\\"')}: demonstrated");`, `${title}: demonstrated`];
  return topic({ id, title, priority, concept, why, code: sample[0], expected: sample[1], kind: "node", ...extra });
}

const nodeTopics = [
  nodeTopic("architecture", "Node.js architecture", "High", "Node combines V8, Node core bindings, libuv, and an event-driven JavaScript API. JavaScript normally runs on one thread while the OS and libuv perform concurrent work.", "The architecture keeps coordination cheap for I/O-heavy services while delegating expensive or blocking operations to kernels, pools, workers, or child processes."),
  nodeTopic("v8", "V8", "High", "V8 parses and compiles JavaScript, optimizes hot code, manages the heap, and performs garbage collection. Shapes and stable types can affect optimization.", "Speculative optimization makes dynamic JavaScript fast, but deoptimization and GC pressure make allocation patterns and profiling evidence important."),
  nodeTopic("libuv", "libuv", "High", "libuv provides the event loop, cross-platform async I/O, a thread pool for selected APIs, timers, and process/signal abstractions.", "Network I/O usually uses OS readiness mechanisms; file, DNS, crypto, and compression work may use the finite pool and contend."),
  nodeTopic("event-loop", "Node.js event loop", "High", "Node advances through timer, poll, check, and close phases, with microtasks and <code>process.nextTick</code> handled at defined boundaries.", "Phase ordering enables efficient readiness polling; excessive callbacks, nextTicks, or synchronous work inflate latency for every connection."),
  nodeTopic("worker-threads", "Worker threads", "High", "Workers run JavaScript in separate V8 isolates and threads. They communicate through messages, transferred buffers, or carefully synchronized shared memory.", "They provide CPU parallelism without a separate process, but startup, serialization, memory, and coordination costs require a bounded pool."),
  nodeTopic("cluster", "Cluster", "Medium", "Cluster starts multiple Node processes that can share a server port, typically one per CPU allocation.", "Separate heaps improve isolation and parallelism, but orchestration platforms often make explicit multi-process containers or replicas clearer."),
  nodeTopic("streams", "Streams", "High", "Streams process data incrementally through readable, writable, transform, and duplex interfaces. <code>pipeline</code> coordinates errors and cleanup.", "Backpressure bounds buffering when producers outpace consumers, protecting memory during uploads, exports, and proxying."),
  nodeTopic("buffers", "Buffers", "High", "Buffers represent byte sequences outside normal string semantics and underpin sockets, files, crypto, and binary protocols.", "Binary I/O avoids costly text conversions, but slicing may share memory and unsafe allocation can expose stale bytes."),
  nodeTopic("file-system", "File system", "Medium", "Node offers callback, Promise, stream, and synchronous filesystem APIs. Correct code handles partial assumptions, atomicity, permissions, and descriptor cleanup.", "Async APIs avoid blocking the event loop, though many operations use the shared libuv pool and local filesystems differ from network storage."),
  nodeTopic("eventemitter", "EventEmitter", "Medium", "EventEmitter provides synchronous in-order local publish/subscribe. Listener exceptions propagate synchronously and <code>error</code> has special semantics.", "Synchronous delivery is predictable and cheap, but it is not a durable message bus and leaked listeners retain objects."),
  nodeTopic("child-processes", "Child processes", "Medium", "Child processes run external commands or isolated Node programs via spawn, exec, execFile, or fork.", "OS process isolation supports binaries and hard failure boundaries; shell injection, buffering, cancellation, and zombie cleanup must be controlled."),
  nodeTopic("process-lifecycle", "Process lifecycle", "High", "Startup validates configuration and dependencies; steady state serves work; shutdown stops admission, drains, closes resources, and exits with meaningful status.", "Explicit lifecycle ownership prevents half-ready instances, hanging deploys, and lost in-flight payments."),
  nodeTopic("environment-variables", "Environment variables", "Medium", "Environment variables are string inputs to configuration, not validated configuration themselves. Parse once into a typed immutable config object.", "Fail-fast validation moves production surprises to startup and avoids inconsistent parsing throughout the codebase."),
  nodeTopic("signals", "Signals", "Medium", "Signals such as SIGTERM notify a process of external lifecycle events. Handlers change default termination behavior.", "Supervisors use signals for deployment and shutdown; handlers must be idempotent and still enforce a deadline."),
  nodeTopic("graceful-shutdown", "Graceful shutdown", "High", "Mark unready, stop accepting work, drain requests and consumers, close dependencies, then force exit after a bounded deadline.", "A staged shutdown preserves availability and at-least-once correctness while preventing indefinitely stuck deployments."),
  nodeTopic("cpu-vs-io", "CPU-bound vs I/O-bound", "High", "I/O-bound work spends time waiting and fits event-driven concurrency. CPU-bound work occupies the JavaScript thread and delays unrelated requests.", "Workload shape, not language fashion, determines fit; CPU work belongs in workers, processes, services, or optimized native systems."),
  nodeTopic("blocking-nonblocking", "Blocking vs non-blocking", "High", "Blocking means the event-loop thread cannot progress; even an asynchronous API can cause contention if its callback performs long synchronous work.", "Tail latency depends on keeping each turn short. Non-blocking designs overlap waits, but need bounded concurrency and backpressure."),
  nodeTopic("memory-leaks", "Memory leaks", "High", "Leaks are reachable objects no longer useful: unbounded caches, listeners, timers, closures, request contexts, or native buffers.", "GC only collects unreachable memory. Heap snapshots, allocation profiles, and retention paths identify ownership mistakes."),
  nodeTopic("performance", "Node.js performance", "High", "Performance work starts with service-level objectives and workload evidence: throughput, p95/p99 latency, event-loop lag, CPU, heap, GC, and downstream time.", "Optimization without measurement moves bottlenecks or harms clarity; load tests must model realistic payloads, concurrency, and dependencies."),
  nodeTopic("profiling", "Profiling", "High", "CPU profiles find hot frames; heap snapshots find retainers; allocation profiles find churn; event-loop and async traces expose stalls.", "Sampling and runtime telemetry replace guesses with evidence, but profiling overhead and production data sensitivity must be managed."),
  nodeTopic("logging", "Logging", "High", "Use structured, leveled logs with request, trace, order, and payment correlation IDs. Redact secrets and avoid duplicate logging at every layer.", "Machine-readable events support search and incident reconstruction; cardinality, volume, and synchronous transports affect cost and latency."),
  nodeTopic("error-handling", "Node.js error handling", "High", "Handle operational errors at boundaries, preserve causes, classify retryability, and let programmer corruption trigger supervised restart after safe logging.", "Different failures need different policy; swallowing or globally continuing after an unknown exception risks invalid process state."),
  nodeTopic("async-error-propagation", "Async error propagation", "High", "Promise rejection travels through awaited or returned chains; callback errors use error-first arguments; stream errors require pipeline or explicit listeners.", "Every async boundary changes propagation rules, so ownership and returning/awaiting Promises are necessary to avoid unhandled work."),
  nodeTopic("10k-concurrent", "How Node handles 10k concurrent requests", "High", "Node does not create 10k JavaScript threads. It keeps connection state, registers readiness with the OS, and runs short callbacks as sockets become ready.", "This scales when requests mostly wait on I/O and concurrency is bounded downstream; memory per connection, keep-alive, pool limits, and backpressure become constraints.", { seniorAnswer: "I would budget connection memory, cap body size and admission, align database pools, monitor event-loop lag and p99, use timeouts, and load test realistic keep-alive traffic. Ten thousand open sockets is not ten thousand simultaneous database queries." }),
  nodeTopic("http-arrival", "What happens when an HTTP request arrives", "High", "The kernel accepts bytes, Node's HTTP parser builds request events, middleware or handlers execute, dependencies perform async work, and the response is serialized back to the socket.", "Each boundary adds queues, limits, cancellation, and failure modes; tracing should follow the request from listener through database and payment provider."),
  nodeTopic("io-heavy-fit", "Why Node is good for I/O-heavy workloads", "High", "A small number of threads can coordinate many waiting operations because callbacks run only when progress is possible.", "Low scheduling overhead and a unified async model fit APIs, proxies, and real-time gateways, provided callbacks remain short."),
  nodeTopic("node-problematic", "When Node becomes problematic", "High", "Node is a poor default when workloads require sustained CPU, strict pause guarantees, huge per-request memory, blocking native dependencies, or unsuitable ecosystem guarantees.", "The event-loop architecture amplifies long synchronous work; acknowledging workload mismatch is better than compensating with accidental complexity."),
  nodeTopic("cpu-intensive", "Handling CPU-intensive operations", "High", "Partition work, bound a worker-thread pool, transfer rather than copy large buffers, support cancellation, and consider processes or a dedicated service for isolation.", "Parallelism restores event-loop responsiveness, but queues must reject or shed load before worker backlog consumes memory and violates deadlines."),
  nodeTopic("worker-internals", "How worker threads work", "High", "Each worker has its own isolate, heap, module graph, and event loop. Messages use structured clone unless data is transferred or shared.", "Isolation avoids ordinary data races; SharedArrayBuffer and Atomics trade copy cost for synchronization complexity and should be narrowly used."),
  nodeTopic("event-loop-blocking", "Identifying event-loop blocking", "High", "Correlate event-loop delay/utilization and p99 latency with CPU profiles, diagnostics, traces, and slow synchronous operations under representative load.", "Lag is a symptom, not a root cause. Profiles reveal whether JSON, regex, crypto, logging, GC, or application loops consume turns."),
];

function textTopic(id, title, priority, concept, why, code, expected, extra = {}) {
  return topic({ id, title, priority, concept, why, code, expected, kind: "text", ...extra });
}

const tsTopics = [
  textTopic("types-interfaces", "Types vs interfaces", "High", "Both describe object shapes. Interfaces support declaration merging and extension; type aliases also represent unions, primitives, tuples, and mapped/conditional types.", "TypeScript is structurally typed, so choose based on modeling and API evolution rather than performance.", `interface Order { id: string; total: number }\ntype OrderState = "pending" | "paid";`, "Compile-time contracts; no runtime output."),
  textTopic("generics", "Generics", "High", "Generics preserve relationships between inputs and outputs without discarding information into broad unions or any.", "Type parameters let one implementation remain reusable while inference carries concrete order/payment types to callers.", `function byId<T extends { id: string }>(xs: T[], id: string): T | undefined {\n  return xs.find(x => x.id === id);\n}`, "Returns the same element type T."),
  textTopic("utility-types", "Utility types", "Medium", "<code>Pick</code>, <code>Omit</code>, <code>Partial</code>, <code>Required</code>, <code>Readonly</code>, and <code>Record</code> derive contracts from canonical models.", "Derivation reduces drift, but blindly using Partial for updates can permit invalid domain states.", `type OrderSummary = Pick<Order, "id" | "total">;\ntype OrderPatch = Partial<Omit<Order, "id">>;`, "Derived compile-time shapes."),
  textTopic("conditional-types", "Conditional types", "High", "Conditional types select a type branch and distribute over naked union parameters.", "They encode type-level decisions used by libraries, but excessive cleverness produces slow, unreadable diagnostics.", `type ApiResult<T> = T extends Error ? { ok: false; error: T } : { ok: true; data: T };`, "Branch selected from T."),
  textTopic("mapped-types", "Mapped types", "High", "Mapped types iterate property keys and can transform names, optionality, readonly status, and value types.", "They keep related DTOs synchronized with a source model while preserving key-level precision.", `type Nullable<T> = { [K in keyof T]: T[K] | null };`, "Every property also accepts null."),
  textTopic("type-narrowing", "Type narrowing", "High", "Control-flow analysis refines unions after checks, assignments, returns, and discriminants.", "The compiler follows reachable paths, allowing broad boundary inputs to become precise only after evidence.", `function total(x: number | { total: number }) {\n  return typeof x === "number" ? x : x.total;\n}`, "Both paths return number."),
  textTopic("type-guards", "Type guards", "High", "Built-in checks and predicates such as <code>x is Payment</code> narrow values; assertion functions can fail fast.", "A custom guard is trusted by the compiler, so its runtime implementation must be tested like validation code.", `function isPayment(x: unknown): x is { id: string } {\n  return typeof x === "object" && x !== null && "id" in x;\n}`, "Narrows unknown after true."),
  textTopic("discriminated-unions", "Discriminated unions", "High", "A shared literal field models mutually exclusive states and enables exhaustive switches.", "Invalid combinations become unrepresentable, which is ideal for payment pending, captured, declined, and refunded states.", `type Payment = { state: "pending" } | { state: "paid"; receipt: string };\nfunction receipt(p: Payment) { return p.state === "paid" ? p.receipt : undefined; }`, "Safe state-specific access."),
  textTopic("keyof", "keyof", "Medium", "<code>keyof T</code> forms a union of known property keys and supports type-safe property APIs.", "Relating a key parameter to an object prevents arbitrary string indexing and preserves the selected value type.", `function get<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }`, "Return type follows selected key."),
  textTopic("typeof", "typeof", "Medium", "In type positions, <code>typeof value</code> captures the static type of a runtime declaration; with <code>as const</code> it preserves literals.", "It makes a runtime constant the source of truth instead of duplicating a separate type.", `const states = ["pending", "paid"] as const;\ntype State = (typeof states)[number];`, '"pending" | "paid"'),
  textTopic("infer", "infer", "High", "<code>infer</code> introduces a type variable inside a conditional type pattern.", "It extracts components such as Promise values, parameters, or return values without callers supplying them.", `type AwaitedValue<T> = T extends Promise<infer U> ? U : T;`, "Extracts U from Promise<U>."),
  textTopic("function-overloads", "Function overloads", "Medium", "Overload signatures describe correlated call shapes; one implementation signature must safely handle all cases.", "Overloads improve APIs when unions lose input/output correlation, but too many signatures signal a confused API.", `function find(id: string): Order | undefined;\nfunction find(ids: string[]): Order[];\nfunction find(x: string | string[]) { /* implementation */ }`, "Caller receives correlated return type."),
  textTopic("generic-constraints", "Generic constraints", "High", "Constraints require capabilities from a type parameter while preserving its more specific shape.", "They allow reusable algorithms to access known fields without widening the result.", `function audit<T extends { id: string }>(value: T): T { console.log(value.id); return value; }`, "T remains intact."),
  textTopic("enums-unions", "Enums vs union types", "Medium", "String literal unions are lightweight and compose well; enums create a runtime object and can suit stable named constants.", "The choice affects emitted JavaScript and interoperability. Object literals with <code>as const</code> often provide both runtime and type values.", `const Status = { Pending: "pending", Paid: "paid" } as const;\ntype Status = (typeof Status)[keyof typeof Status];`, '"pending" | "paid"'),
  textTopic("unknown-any", "unknown vs any", "High", "<code>unknown</code> requires narrowing before use; <code>any</code> disables checking and propagates unsafety.", "External JSON is not trustworthy because TypeScript erases at runtime, so unknown creates an explicit validation boundary.", `const payload: unknown = JSON.parse(input);\n// validate payload before accessing fields`, "Unsafe access is rejected."),
  textTopic("never", "never", "High", "<code>never</code> represents impossible completion or values and powers exhaustive checks.", "When all union variants are handled, the remainder is never; a new variant then creates a compile error.", `function impossible(x: never): never { throw new Error(String(x)); }`, "Exhaustiveness helper."),
  textTopic("type-assertions", "Type assertions", "Medium", "Assertions tell the compiler to trust the programmer; they perform no runtime conversion or validation.", "They are escape hatches for knowledge TypeScript cannot prove, and should be narrow, documented, and boundary-tested.", `const body = raw as PaymentRequest; // unsafe without validation`, "No runtime check occurs."),
  textTopic("declaration-files", "Declaration files", "Medium", "<code>.d.ts</code> files describe JavaScript modules, globals, and package APIs without emitting code.", "They bridge untyped runtime code into static checking; declarations must match actual exports and versions.", `declare module "legacy-payments" {\n  export function charge(cents: number): Promise<string>;\n}`, "Adds compile-time module types."),
  textTopic("module-augmentation", "Module augmentation", "Low", "Module augmentation merges additional declarations into an existing module, commonly for framework request context.", "It can model runtime decoration, but global augmentation creates coupling and must be loaded consistently.", `declare module "express-serve-static-core" {\n  interface Request { principal?: { id: string } }\n}`, "Request gains principal type."),
  textTopic("type-safe-apis", "Type-safe APIs", "High", "Type-safe APIs share or generate request, response, and error contracts while still validating every runtime boundary.", "Static types prevent internal drift; schemas, versioning, and contract tests handle clients that do not run your compiler.", `type Result<T> = { ok: true; data: T } | { ok: false; code: string };`, "Exhaustive API result handling."),
  textTopic("zod-validation", "Zod / runtime validation", "High", "Runtime schemas parse unknown input, return typed output, and can compose transforms and refinements.", "TypeScript disappears after compilation; schema inference reduces duplication while runtime parsing protects HTTP and queue boundaries.", `const Payment = z.object({ orderId: z.string().uuid(), amount: z.number().positive() });\nconst payment = Payment.parse(req.body);`, "Validated typed payment or structured error."),
  textTopic("compiler-config", "TypeScript compiler configuration", "High", "Use strictness, module/moduleResolution aligned to runtime, target/lib, noUncheckedIndexedAccess, exactOptionalPropertyTypes, source maps, and isolated build settings deliberately.", "The compiler configuration defines project-wide soundness and emit semantics; copied defaults can produce runtime module failures or hidden null bugs.", `{\n  "compilerOptions": { "strict": true, "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true }\n}`, "Stricter project-wide checks."),
];

function expressTopic(id, title, priority, concept, why, code, expected, extra = {}) {
  return topic({ id, title, priority, concept, why, code, expected, kind: "node", ...extra });
}

const expressTopics = [
  expressTopic("architecture", "Express architecture", "High", "Express is a thin ordered router/middleware pipeline around Node HTTP. Keep transport adaptation separate from application and domain policy.", "Thin infrastructure boundaries prevent request objects, status codes, and framework lifecycle from leaking through the order/payment core.", `const layers = ["route", "validation", "controller", "service", "repository"];\nconsole.log(layers.join(" -> "));`, "route -> validation -> controller -> service -> repository"),
  expressTopic("middleware", "Middleware", "High", "Middleware runs in registration order and must end the response, call <code>next()</code>, or pass an error. Prefer narrow cross-cutting responsibilities.", "The chain composes reusable transport concerns, but hidden ordering dependencies and double completion cause fragile behavior.", `const chain = [req => (req.trace="t1"), req => (req.user="u1")];\nconst req = {}; chain.forEach(fn => fn(req)); console.log(req.trace, req.user);`, "t1 u1"),
  expressTopic("authentication", "Authentication", "High", "Authentication verifies identity using sessions, tokens, or mTLS and attaches a minimal principal after issuer, audience, expiry, and signature checks.", "Identity must be established before policy. Token decoding without verification is not authentication.", `const principal = { sub: "u1", scopes: ["orders:read"] };\nconsole.log(principal.sub);`, "u1"),
  expressTopic("authorization", "Authorization", "High", "Authorization decides whether a verified principal may perform an action on a resource, including tenant and ownership constraints.", "Central policy avoids scattered role checks and protects against IDOR where authenticated users access another account's orders.", `const canRead = (p, o) => p.tenantId === o.tenantId;\nconsole.log(canRead({tenantId:"t1"}, {tenantId:"t1"}));`, "true"),
  expressTopic("rbac", "RBAC", "High", "RBAC maps roles to permissions; production policy often combines roles with ownership, tenant, state, or amount attributes.", "Roles simplify administration but role explosion and coarse checks require a clear permission vocabulary and deny-by-default behavior.", `const permissions = { support: new Set(["order:read"]), admin: new Set(["order:refund"]) };\nconsole.log(permissions.support.has("order:read"));`, "true"),
  expressTopic("request-validation", "Request validation", "High", "Validate params, query, headers, and bodies at the edge; reject unknown or malformed data with stable machine-readable errors.", "Runtime validation protects the domain from hostile or stale clients and prevents implicit coercion bugs.", `const input = { amount: 100 };\nif (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("invalid");\nconsole.log("valid");`, "valid"),
  expressTopic("error-handling", "Express error handling", "High", "Translate known domain errors once in terminal error middleware, preserve causes, redact internals, and avoid writing after headers are sent.", "Central translation makes API semantics consistent while logs retain operational context without leaking stack traces.", `const map = { CARD_DECLINED: 422, NOT_FOUND: 404 };\nconsole.log(map.CARD_DECLINED);`, "422"),
  expressTopic("controllers", "Controllers", "High", "Controllers adapt HTTP input to use-case calls and map results to HTTP. They should not own pricing, transaction, or provider policy.", "A thin controller is easy to contract-test and lets the same application use case serve jobs, GraphQL, or CLI adapters.", `const controller = async (req, service) => ({ status: 201, body: await service.create(req.body) });\nconsole.log(typeof controller);`, "function"),
  expressTopic("services", "Services", "High", "Application services coordinate domain rules, repositories, transactions, idempotency, and external gateways around a use case.", "They establish an explicit orchestration boundary without turning into unstructured global helper classes.", `const checkout = async ({ orderRepo, payments }, id) => payments.authorize((await orderRepo.get(id)).total);\nconsole.log(typeof checkout);`, "function"),
  expressTopic("repositories", "Repositories", "High", "Repositories expose domain-oriented persistence operations and hide query mechanics, while transaction ownership remains explicit.", "They reduce database coupling, but generic CRUD repositories often hide needed query semantics and performance.", `const repo = new Map([["o1", { id: "o1" }]]);\nconsole.log(repo.get("o1").id);`, "o1"),
  expressTopic("dependency-injection", "Dependency injection", "Medium", "Construct services with explicit dependencies at a composition root; avoid importing mutable singletons inside domain code.", "Explicit dependencies improve tests and lifecycle control without requiring a heavyweight container.", `const makeService = ({ clock }) => ({ now: () => clock.now() });\nconsole.log(makeService({clock:{now:()=>42}}).now());`, "42"),
  expressTopic("configuration", "Configuration management", "High", "Parse and validate configuration once at startup, separate secrets from ordinary settings, and expose an immutable typed object.", "Failing before readiness is safer than discovering a malformed payment URL during live traffic.", `const config = Object.freeze({ timeoutMs: Number(process.env.TIMEOUT_MS || 1000) });\nconsole.log(config.timeoutMs);`, "1000"),
  expressTopic("logging", "Express logging", "High", "Create request context early, emit structured completion logs, correlate downstream calls, and redact authorization, cookies, and payment data.", "Boundary logging captures method, route, status, duration, and trace once, avoiding noisy duplicate records.", `const log = { event: "request_complete", route: "/orders/:id", status: 200 };\nconsole.log(JSON.stringify(log));`, '{"event":"request_complete","route":"/orders/:id","status":200}'),
  expressTopic("api-versioning", "API versioning", "Medium", "Version only when contracts make incompatible changes; support additive evolution, deprecation telemetry, migration windows, and explicit ownership.", "URLs or headers identify a contract, but versioning does not remove the operational cost of parallel implementations.", `const routes = new Map([["v1", "/v1/orders"], ["v2", "/v2/orders"]]);\nconsole.log(routes.get("v2"));`, "/v2/orders"),
  expressTopic("pagination", "Pagination", "High", "Offset pagination is simple but unstable and costly at depth; cursor/keyset pagination uses a deterministic unique ordering and opaque cursor.", "Keyset queries continue from indexed values, avoiding skipped/duplicated rows during concurrent order creation.", `const rows = [{id:3},{id:2},{id:1}];\nconsole.log(rows.filter(x => x.id < 3).slice(0,1)[0].id);`, "2"),
  expressTopic("filtering", "Filtering", "Medium", "Expose an allowlisted filter grammar mapped to parameterized queries and indexed fields; define null and multi-value semantics.", "Arbitrary query forwarding creates injection and unbounded-query risk, while explicit filters preserve a stable API.", `const allowed = new Set(["status", "customerId"]);\nconsole.log(allowed.has("status"));`, "true"),
  expressTopic("sorting", "Sorting", "Medium", "Allowlist sortable fields, define direction and null order, and append a unique tie-breaker for deterministic pages.", "Without total ordering, equal values move between pages and cursor pagination cannot resume reliably.", `const orders = [{id:2,total:10},{id:1,total:10}].sort((a,b)=>b.total-a.total || b.id-a.id);\nconsole.log(orders.map(x=>x.id).join(","));`, "2,1"),
  expressTopic("searching", "Searching", "Medium", "Choose prefix, full-text, trigram, or external search based on semantics; normalize input, cap work, and rank deterministically.", "A database LIKE scan may work initially but becomes unpredictable without suitable indexes and query limits.", `const orders = ["alpha-1", "beta-2"];\nconsole.log(orders.filter(x => x.includes("alpha")).length);`, "1"),
  expressTopic("file-uploads", "File uploads", "High", "Stream uploads with size/type limits, sanitize metadata, store outside app memory, scan asynchronously, and use signed object-storage URLs when suitable.", "Buffering attacker-controlled files exhausts memory; streaming and direct uploads bound application resource use.", `const { Readable } = require("stream");\nlet bytes=0; Readable.from(["abc"]).on("data", c => bytes += c.length).on("end", () => console.log(bytes));`, "3"),
  expressTopic("webhooks", "Webhooks", "High", "Verify signatures over raw bytes, enforce timestamp tolerance, persist receipt idempotently, acknowledge quickly, and process asynchronously.", "Providers retry and deliver out of order; durable idempotent ingestion separates availability from business processing.", `const seen = new Set();\nconst accept = id => seen.has(id) ? "duplicate" : (seen.add(id), "accepted");\nconsole.log(accept("evt1"), accept("evt1"));`, "accepted duplicate"),
  expressTopic("background-jobs", "Background jobs", "High", "Use durable queues for slow or retryable work, with idempotent handlers, bounded retries, backoff, dead-lettering, and observability.", "HTTP request lifetimes are poor owners for email, reconciliation, and provider retries; durable queues survive process restarts.", `const job = { id: "refund:o1", attempt: 1, maxAttempts: 5 };\nconsole.log(job.attempt < job.maxAttempts);`, "true"),
  expressTopic("bad-good-architecture", "Bad vs good architecture", "High", "Bad architecture mixes validation, SQL, payment calls, policy, and response mapping in one route. Good architecture uses thin adapters, explicit use cases, domain rules, and replaceable infrastructure.", "Separation is valuable when it clarifies ownership, testing, and transactions—not as folder ceremony. Dependencies should point toward stable policy.", `const good = ["route", "controller", "checkoutUseCase", "repositories/gateways"];\nconsole.log(good.join(" -> "));`, "route -> controller -> checkoutUseCase -> repositories/gateways", { exercise: "Refactor a single 150-line checkout route into validation, controller, use case, repository, and payment gateway. Explain transaction and idempotency boundaries." }),
];

const pages = [
  {
    file: "01-javascript.html",
    data: {
      id: "01",
      title: "JavaScript Deep Revision",
      kicker: "Phase 01 · Language runtime",
      lead: "Senior-level JavaScript mechanics through order and payment examples: explain the runtime, predict behavior, and discuss production trade-offs.",
      topics: jsTopics,
      prev: null,
      next: { file: "02-nodejs.html", title: "Node.js Deep Dive" },
    },
  },
  {
    file: "02-nodejs.html",
    data: {
      id: "02",
      title: "Node.js Deep Dive",
      kicker: "Phase 02 · Runtime and operations",
      lead: "Reason from V8, libuv, and the event loop to concurrency, shutdown, profiling, and reliable high-throughput services.",
      topics: nodeTopics,
      prev: { file: "01-javascript.html", title: "JavaScript Deep Revision" },
      next: { file: "03-typescript.html", title: "TypeScript Mastery" },
    },
  },
  {
    file: "03-typescript.html",
    data: {
      id: "03",
      title: "TypeScript Mastery",
      kicker: "Phase 03 · Type-system design",
      lead: "Model valid domain states, protect runtime boundaries, and design maintainable type-safe APIs without type-level ceremony.",
      topics: tsTopics,
      prev: { file: "02-nodejs.html", title: "Node.js Deep Dive" },
      next: { file: "04-express.html", title: "Express & API Architecture" },
    },
  },
  {
    file: "04-express.html",
    data: {
      id: "04",
      title: "Express & API Architecture",
      kicker: "Phase 04 · HTTP application design",
      lead: "Build secure, observable Express boundaries around testable order and payment use cases, including failure and scaling concerns.",
      topics: expressTopics,
      prev: { file: "03-typescript.html", title: "TypeScript Mastery" },
      next: { file: "05-rest.html", title: "REST API Design" },
    },
  },
];

for (const page of pages) {
  fs.writeFileSync(path.join(outDir, page.file), phasePage(page.data), "utf8");
  console.log(`${page.file}: ${page.data.topics.length} topics`);
}
