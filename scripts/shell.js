/**
 * Shared HTML shell for interview-prep phase pages.
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function badgeClass(priority) {
  const p = (priority || "med").toLowerCase();
  if (p === "high") return "high";
  if (p === "low") return "low";
  return "med";
}

function renderRunner(ex) {
  if (!ex) return "";
  if (ex.kind === "js") {
    return `
      <div class="runner">
        <pre class="code" data-code>${escapeHtml(ex.code)}</pre>
        <div class="runner-toolbar">
          <button type="button" class="btn btn-primary btn-sm" data-run>Run</button>
          <span style="font-size:0.8rem;color:var(--muted)">Runs in-browser; console.log is captured</span>
        </div>
        <pre class="runner-out">${escapeHtml(ex.expected || "Click Run")}</pre>
      </div>`;
  }
  if (ex.kind === "node" || ex.kind === "shell" || ex.kind === "sql" || ex.kind === "text") {
    let extra = "";
    if (ex.expected) {
      extra = `<div class="expected"><strong>Expected:</strong><pre>${escapeHtml(ex.expected)}</pre></div>`;
    }
    if (ex.resultTable) {
      const rows = ex.resultTable.rows
        .map((r) => "<tr>" + r.map((c) => `<td>${escapeHtml(c)}</td>`).join("") + "</tr>")
        .join("");
      const heads = ex.resultTable.headers
        .map((h) => `<th>${escapeHtml(h)}</th>`)
        .join("");
      extra += `<div class="sql-result"><table><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    const label = ex.label || (ex.kind === "sql" ? "SQL" : ex.kind === "node" ? "Node.js" : "Example");
    return `
      <div class="example-block">
        <div style="font-size:0.8rem;color:var(--muted);margin-bottom:4px">${escapeHtml(label)}</div>
        <pre>${escapeHtml(ex.code)}</pre>
        ${extra}
      </div>`;
  }
  if (ex.kind === "design") {
    return `<div class="design-block">${ex.html}</div>`;
  }
  return "";
}

function renderTopic(t) {
  const pri = badgeClass(t.priority);
  const mistakes = (t.mistakes || [])
    .map((m) => `<li>${m}</li>`)
    .join("");
  const interviewQs = (t.interview || [])
    .map((q) => `<li>${q}</li>`)
    .join("");
  const seniorQs = (t.senior || [])
    .map((q) => `<li>${q}</li>`)
    .join("");
  const answers = (t.answers || [])
    .map((a) => `<div class="speak">${a}</div>`)
    .join("");
  const seniorAnswers = (t.seniorAnswers || [])
    .map((a) => `<div class="speak">${a}</div>`)
    .join("");

  return `
  <article class="topic" id="${t.id}">
    <div class="topic-head">
      <h3>${escapeHtml(t.title)}</h3>
      <span class="badge ${pri}">${escapeHtml(t.priority || "Medium")}</span>
    </div>
    <div class="section-label">Concept</div>
    <p>${t.concept}</p>
    <div class="section-label">Why it works this way</div>
    <p>${t.why}</p>
    <div class="section-label">Running example</div>
    ${renderRunner(t.example)}
    ${t.exampleNote ? `<p style="font-size:0.9rem;color:var(--muted)">${t.exampleNote}</p>` : ""}
    <div class="section-label">Common mistakes / interview traps</div>
    <ul>${mistakes}</ul>
    <div class="section-label">Interview questions</div>
    <ul>${interviewQs}</ul>
    <details class="reveal">
      <summary>Reveal model answers</summary>
      ${answers || "<p>Practice aloud first, then refine.</p>"}
    </details>
    <div class="section-label">Senior follow-ups</div>
    <ul>${seniorQs}</ul>
    <details class="reveal">
      <summary>Reveal senior-level answers</summary>
      ${seniorAnswers || "<p>Answer with trade-offs and failure modes.</p>"}
    </details>
    <div class="section-label">Exercise</div>
    <p>${t.exercise}</p>
    <div class="topic-progress">
      <label><input type="checkbox" class="mark-done" /> Mark as reviewed</label>
    </div>
  </article>`;
}

function renderDesignProblem(p) {
  const sections = [
    ["Requirements", p.requirements],
    ["APIs", p.apis],
    ["Database schema", p.schema],
    ["Architecture", p.architecture],
    ["Scaling strategy", p.scaling],
    ["Failure scenarios", p.failures],
    ["Bottlenecks", p.bottlenecks],
    ["Trade-offs", p.tradeoffs],
    ["Interview questions", p.interview],
  ]
    .map(([label, body]) => {
      if (!body) return "";
      if (Array.isArray(body)) {
        return `<div class="design-block"><h4>${label}</h4><ul>${body
          .map((x) => `<li>${x}</li>`)
          .join("")}</ul></div>`;
      }
      return `<div class="design-block"><h4>${label}</h4><p>${body}</p></div>`;
    })
    .join("");

  return `
  <article class="topic" id="${p.id}">
    <div class="topic-head">
      <h3>${escapeHtml(p.title)}</h3>
      <span class="badge high">Design</span>
    </div>
    <p>${p.intro || ""}</p>
    ${sections}
    <div class="topic-progress">
      <label><input type="checkbox" class="mark-done" /> Mark as reviewed</label>
    </div>
  </article>`;
}

function renderProject(p) {
  const blocks = [
    ["Requirements", p.requirements],
    ["Architecture", p.architecture],
    ["Database", p.database],
    ["APIs", p.apis],
    ["Security", p.security],
    ["Testing", p.testing],
    ["Performance", p.performance],
    ["Scaling", p.scaling],
    ["Failure handling", p.failures],
  ]
    .map(([label, body]) => {
      if (!body) return "";
      if (Array.isArray(body)) {
        return `<div class="design-block"><h4>${label}</h4><ul>${body
          .map((x) => `<li>${x}</li>`)
          .join("")}</ul></div>`;
      }
      return `<div class="design-block"><h4>${label}</h4><p>${body}</p></div>`;
    })
    .join("");

  return `
  <article class="topic" id="${p.id}">
    <div class="topic-head">
      <h3>${escapeHtml(p.title)}</h3>
      <span class="badge high">Project</span>
    </div>
    <p>${p.intro || ""}</p>
    ${blocks}
    <div class="topic-progress">
      <label><input type="checkbox" class="mark-done" /> Mark as reviewed</label>
    </div>
  </article>`;
}

function phasePage({ id, title, kicker, lead, topics, designProblems, projects, prev, next }) {
  const topicHtml = (topics || []).map(renderTopic).join("\n");
  const designHtml = (designProblems || []).map(renderDesignProblem).join("\n");
  const projectHtml = (projects || []).map(renderProject).join("\n");

  const prevLink = prev
    ? `<a class="btn btn-ghost" href="${prev.file}">← ${prev.title}</a>`
    : `<a class="btn btn-ghost" href="../nodejs-interview-preparation.html">← Hub</a>`;
  const nextLink = next
    ? `<a class="btn btn-primary" href="${next.file}">${next.title} →</a>`
    : `<a class="btn btn-primary" href="../nodejs-interview-preparation.html">Back to hub</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — Node.js Interview Prep</title>
  <link rel="stylesheet" href="../assets/prep.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap" />
</head>
<body data-page="phase" data-phase="${id}">
  <div class="app">
    <nav class="sidebar">
      <h1>Node.js Interview Prep</h1>
      <p class="tag">5-year · Backend / Full-stack · Senior track</p>
      <a class="nav-link" href="../nodejs-interview-preparation.html">← Hub</a>
      <div class="nav-group">Phases</div>
      <div id="phase-links">
        <a class="nav-link" href="01-javascript.html">01 JavaScript</a>
        <a class="nav-link" href="02-nodejs.html">02 Node.js</a>
        <a class="nav-link" href="03-typescript.html">03 TypeScript</a>
        <a class="nav-link" href="04-express.html">04 Express</a>
        <a class="nav-link" href="05-rest.html">05 REST APIs</a>
        <a class="nav-link" href="06-databases.html">06 Databases</a>
        <a class="nav-link" href="07-redis.html">07 Redis</a>
        <a class="nav-link" href="08-auth-security.html">08 Auth &amp; Security</a>
        <a class="nav-link" href="09-microservices.html">09 Microservices</a>
        <a class="nav-link" href="10-queues.html">10 Queues</a>
        <a class="nav-link" href="11-system-design.html">11 System Design</a>
        <a class="nav-link" href="12-performance.html">12 Performance</a>
        <a class="nav-link" href="13-docker.html">13 Docker &amp; Deploy</a>
        <a class="nav-link" href="14-testing.html">14 Testing</a>
        <a class="nav-link" href="15-coding.html">15 Coding</a>
        <a class="nav-link" href="16-projects.html">16 Projects</a>
      </div>
      <div class="meta">Mark topics reviewed as you go. Progress is stored in this browser.</div>
    </nav>
    <main>
      <p class="kicker">${escapeHtml(kicker)}</p>
      <header class="hero">
        <h2>${escapeHtml(title)}</h2>
        <p class="lead">${lead}</p>
      </header>
      <div class="note">Interview shape: claim → mechanism → production example → failure → trade-off. Reveal answers only after you attempt them aloud.</div>
      <div class="phase-layout">
        <aside class="toc">
          <strong>On this page</strong>
          <div class="toc-list"></div>
        </aside>
        <div class="topics">
          ${topicHtml}
          ${designHtml}
          ${projectHtml}
          <div class="phase-nav">${prevLink}${nextLink}</div>
        </div>
      </div>
      <footer class="fine">Phase ${id} · Node.js / TypeScript interview preparation</footer>
    </main>
  </div>
  <script src="../assets/prep.js"></script>
</body>
</html>`;
}

module.exports = {
  escapeHtml,
  renderTopic,
  renderDesignProblem,
  renderProject,
  phasePage,
};
