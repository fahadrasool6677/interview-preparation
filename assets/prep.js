(function () {
  "use strict";

  const PHASES = [
    { id: "01", file: "01-javascript.html", title: "01 JavaScript" },
    { id: "02", file: "02-nodejs.html", title: "02 Node.js" },
    { id: "03", file: "03-typescript.html", title: "03 TypeScript" },
    { id: "04", file: "04-express.html", title: "04 Express" },
    { id: "05", file: "05-rest.html", title: "05 REST APIs" },
    { id: "06", file: "06-databases.html", title: "06 Databases" },
    { id: "07", file: "07-redis.html", title: "07 Redis" },
    { id: "08", file: "08-auth-security.html", title: "08 Auth & Security" },
    { id: "09", file: "09-microservices.html", title: "09 Microservices" },
    { id: "10", file: "10-queues.html", title: "10 Queues" },
    { id: "11", file: "11-system-design.html", title: "11 System Design" },
    { id: "12", file: "12-performance.html", title: "12 Performance" },
    { id: "13", file: "13-docker.html", title: "13 Docker & Deploy" },
    { id: "14", file: "14-testing.html", title: "14 Testing" },
    { id: "15", file: "15-coding.html", title: "15 Coding" },
    { id: "16", file: "16-projects.html", title: "16 Projects" },
  ];

  const TOPIC_PROGRESS_KEY = "nodeInterviewTopicProgress.v1";

  function isPhasePage() {
    return document.body.dataset.page === "phase";
  }

  function isHubPage() {
    return document.body.dataset.page === "hub" || document.querySelector(".nav-btn[data-panel]");
  }

  function phaseBaseHref() {
    const path = window.location.pathname;
    if (path.includes("/phases/")) return "";
    return "phases/";
  }

  function hubHref() {
    const path = window.location.pathname;
    if (path.includes("/phases/")) return "../nodejs-interview-preparation.html";
    return "nodejs-interview-preparation.html";
  }

  function renderPhaseNavLinks(container) {
    if (!container) return;
    const base = phaseBaseHref();
    const current = document.body.dataset.phase || "";
    // Prefer static HTML links (work even if script fails on file://).
    // Only rebuild when the container is empty.
    if (!container.querySelector("a.nav-link")) {
      container.innerHTML = PHASES.map((p) => {
        return `<a class="nav-link" href="${base}${p.file}">${p.title}</a>`;
      }).join("");
    }
    container.querySelectorAll("a.nav-link").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const match = PHASES.find((p) => href.endsWith(p.file));
      a.classList.toggle("active", !!(match && match.id === current));
    });
  }

  function initHubPanels() {
    const panels = document.querySelectorAll(".panel");
    const navBtns = document.querySelectorAll(".nav-btn[data-panel]");
    if (!navBtns.length) return;

    navBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        navBtns.forEach((b) => b.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        const panel = document.getElementById(btn.dataset.panel);
        if (panel) panel.classList.add("active");
        window.scrollTo(0, 0);
      });
    });
  }

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(TOPIC_PROGRESS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveProgress(state) {
    localStorage.setItem(TOPIC_PROGRESS_KEY, JSON.stringify(state));
  }

  function topicKey(phaseId, topicId) {
    return `${phaseId}::${topicId}`;
  }

  function initTopicProgress() {
    const phaseId = document.body.dataset.phase;
    if (!phaseId) return;
    const state = loadProgress();

    document.querySelectorAll(".topic").forEach((topic) => {
      const id = topic.id;
      if (!id) return;
      const key = topicKey(phaseId, id);
      const done = !!state[key];
      const box = topic.querySelector(".mark-done");
      if (box) {
        box.checked = done;
        box.addEventListener("change", () => {
          const s = loadProgress();
          if (box.checked) s[key] = true;
          else delete s[key];
          saveProgress(s);
          updateTocDone(phaseId);
        });
      }
    });
    updateTocDone(phaseId);
  }

  function updateTocDone(phaseId) {
    const state = loadProgress();
    document.querySelectorAll(".toc a[href^='#']").forEach((a) => {
      const id = a.getAttribute("href").slice(1);
      const key = topicKey(phaseId, id);
      a.classList.toggle("done", !!state[key]);
    });
  }

  async function runSnippet(code) {
    const logs = [];
    const fakeConsole = {
      log: (...args) => logs.push(args.map(stringify).join(" ")),
      warn: (...args) => logs.push("WARN: " + args.map(stringify).join(" ")),
      error: (...args) => logs.push("ERROR: " + args.map(stringify).join(" ")),
      info: (...args) => logs.push(args.map(stringify).join(" ")),
    };

    function stringify(v) {
      if (typeof v === "string") return v;
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    }

    try {
      // Wrap so snippets may use top-level await (debounce/retry demos, etc.)
      const fn = new Function(
        "console",
        "return (async () => {\n" + code + "\n})();"
      );
      const result = await fn(fakeConsole);
      // Give microtasks/timers a short window for demos that schedule work
      await new Promise((r) => setTimeout(r, 50));
      if (result !== undefined) logs.push("→ " + stringify(result));
      return { ok: true, output: logs.join("\n") || "(no output)" };
    } catch (err) {
      return { ok: false, output: (err && err.stack) || String(err) };
    }
  }

  function initRunners() {
    document.querySelectorAll(".runner").forEach((runner) => {
      const pre = runner.querySelector("pre[data-code], pre.code");
      const out = runner.querySelector(".runner-out");
      const btn = runner.querySelector("[data-run]");
      if (!pre || !out || !btn) return;

      btn.addEventListener("click", async () => {
        const code = pre.textContent;
        btn.disabled = true;
        out.textContent = "Running…";
        const result = await runSnippet(code);
        out.textContent = result.output;
        out.classList.toggle("error", !result.ok);
        btn.disabled = false;
      });
    });
  }

  function buildToc() {
    const toc = document.querySelector(".toc-list");
    if (!toc) return;
    const topics = document.querySelectorAll(".topic[id]");
    toc.innerHTML = [...topics]
      .map((t) => {
        const title = t.querySelector(".topic-head h3");
        const label = title ? title.textContent : t.id;
        return `<a href="#${t.id}">${label}</a>`;
      })
      .join("");
  }

  function initAssessment() {
    const form = document.getElementById("assess-form");
    if (!form) return;

    const storageKey = "nodeInterviewAssessment.v1";

    function collectAnswers() {
      const data = {};
      const fd = new FormData(form);
      for (const [k, v] of fd.entries()) data[k] = v;
      return data;
    }

    function fillForm(data) {
      Object.entries(data).forEach(([k, v]) => {
        const fields = form.elements[k];
        if (!fields) return;
        if (fields.length && fields[0].type === "radio") {
          [...fields].forEach((r) => {
            r.checked = r.value === String(v);
          });
        } else if (fields.type === "radio") {
          fields.checked = fields.value === String(v);
        } else {
          fields.value = v;
        }
      });
    }

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) fillForm(JSON.parse(saved));
    } catch {
      /* ignore */
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = collectAnswers();
      localStorage.setItem(storageKey, JSON.stringify(data));
      const unanswered = [];
      const lowConf = [];
      for (let i = 1; i <= 20; i++) {
        const a = (data["a" + i] || "").trim();
        const c = Number(data["c" + i] || 0);
        if (!a) unanswered.push(i);
        if (c && c <= 2) lowConf.push(i);
        else if (a && !c) lowConf.push(i);
      }
      const box = document.getElementById("assessment-summary");
      const text = document.getElementById("summary-text");
      if (box && text) {
        box.style.display = "block";
        text.textContent =
          "Saved locally. Unanswered: " +
          (unanswered.length ? unanswered.join(", ") : "none") +
          ". Confidence 1–2 or missing: " +
          (lowConf.length ? lowConf.join(", ") : "none") +
          ". Copy and send the answers in chat for analysis.";
      }
    });

    const copyBtn = document.getElementById("copy-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const data = collectAnswers();
        const topics = [...document.querySelectorAll(".question")].map((q, i) => ({
          n: i + 1,
          topic: q.dataset.topic,
          q: q.querySelector(".qnum").textContent,
        }));
        let out = "Node.js interview assessment answers\n\n";
        topics.forEach((t) => {
          out += "Q" + t.n + " [" + t.topic + "] " + t.q + "\n";
          out += "Confidence: " + (data["c" + t.n] || "not rated") + "/5\n";
          out += (data["a" + t.n] || "(blank)") + "\n\n";
        });
        try {
          await navigator.clipboard.writeText(out);
          alert("Copied. Paste into the interview-prep chat.");
        } catch {
          window.prompt("Copy this text:", out);
        }
      });
    }

    const clearBtn = document.getElementById("clear-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (!confirm("Clear saved assessment answers?")) return;
        localStorage.removeItem(storageKey);
        form.reset();
        const box = document.getElementById("assessment-summary");
        if (box) box.style.display = "none";
      });
    }
  }

  function initTracker() {
    const body = document.getElementById("tracker-body");
    if (!body) return;

    const trackerKey = "nodeInterviewTracker.v1";
    const topics = [
      "JavaScript",
      "Node.js",
      "TypeScript",
      "Express / architecture",
      "REST APIs",
      "PostgreSQL",
      "Prisma",
      "Redis & caching",
      "Auth & security",
      "Microservices",
      "Message queues",
      "System design",
      "Performance & debugging",
      "Docker & deploy",
      "Testing",
      "Coding interviews",
    ];
    const statuses = [
      "Not Started",
      "Learning",
      "Practicing",
      "Weak",
      "Good",
      "Interview Ready",
    ];

    function renderTracker(state) {
      body.innerHTML = "";
      topics.forEach((topic, i) => {
        const row = state[i] || { status: "Not Started", score: "", weak: "", last: "" };
        const tr = document.createElement("tr");
        tr.className = "tracker-row";
        tr.innerHTML =
          "<td>" +
          topic +
          "</td>" +
          "<td><select data-i='" +
          i +
          "' data-f='status'>" +
          statuses
            .map(
              (s) =>
                "<option" + (s === row.status ? " selected" : "") + ">" + s + "</option>"
            )
            .join("") +
          "</select></td>" +
          "<td><input data-i='" +
          i +
          "' data-f='score' value='" +
          (row.score || "") +
          "' placeholder='—' style='width:70px' /></td>" +
          "<td><input data-i='" +
          i +
          "' data-f='weak' value='" +
          (row.weak || "").replace(/"/g, "&quot;") +
          "' /></td>" +
          "<td><input data-i='" +
          i +
          "' data-f='last' value='" +
          (row.last || "") +
          "' placeholder='YYYY-MM-DD' /></td>";
        body.appendChild(tr);
      });
    }

    let trackerState = [];
    try {
      trackerState = JSON.parse(localStorage.getItem(trackerKey) || "[]");
    } catch {
      trackerState = [];
    }
    renderTracker(trackerState);

    const saveBtn = document.getElementById("save-tracker");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const next = topics.map((_, i) => {
          const status = document.querySelector("select[data-i='" + i + "']").value;
          const score = document.querySelector(
            "input[data-i='" + i + "'][data-f='score']"
          ).value;
          const weak = document.querySelector(
            "input[data-i='" + i + "'][data-f='weak']"
          ).value;
          const last = document.querySelector(
            "input[data-i='" + i + "'][data-f='last']"
          ).value;
          return { status, score, weak, last };
        });
        localStorage.setItem(trackerKey, JSON.stringify(next));
        alert("Tracker saved in this browser.");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderPhaseNavLinks(document.getElementById("phase-links"));
    initHubPanels();
    initAssessment();
    initTracker();
    initLocalNav();
    if (isPhasePage()) {
      buildToc();
      initTopicProgress();
      initRunners();
    }
  });

  // IDE Simple Browser often blocks bare file:// link navigation.
  // Force assign to the resolved absolute URL; prefer same-tab navigation.
  function initLocalNav() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (/^https?:/i.test(href)) return;
      if (a.target && a.target !== "" && a.target !== "_self") return;

      // Only handle our local study links
      const isLocalHtml =
        href.endsWith(".html") ||
        href.includes("/phases/") ||
        href.startsWith("phases/") ||
        href.startsWith("../");
      if (!isLocalHtml) return;

      e.preventDefault();
      e.stopPropagation();
      try {
        const abs = new URL(href, window.location.href).href;
        window.location.assign(abs);
      } catch {
        window.location.href = href;
      }
    });
  }

  window.Prep = { PHASES, runSnippet, hubHref, phaseBaseHref };
})();
