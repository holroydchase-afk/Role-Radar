// In-memory stand-in for the artifact runtime's `window.claude.use("db")`, so the page runs
// outside claude.ai on demo data. Implements only what role-radar.html uses:
// collection(name).onSnapshot, doc(path).onSnapshot / update / set.
// Also fakes the Gmail connector (use("mcp")) with the fictional threads in seed.gmail.
// FOR DEMOS AND TESTS ONLY. It never talks to a real database.
(function () {
  const seed = window.__RR_SEED__ || {};
  const DAY = 864e5;
  const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  // "@d-3" = date 3 days ago, "@t-3" = timestamp 3 days ago, "@d--2" = 2 days from now.
  function resolve(v) {
    if (typeof v === "string") {
      const m = /^@([dt])(-?)(-?\d+)$/.exec(v);
      if (m) {
        const n = Number(m[3]) * (m[2] === "-" ? 1 : -1);
        const d = new Date(Date.now() - n * DAY);
        if (m[1] === "d") d.setHours(12, 0, 0, 0);
        return m[1] === "d" ? ymd(d) : d.toISOString();
      }
      return v;
    }
    if (Array.isArray(v)) return v.map(resolve);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x)]));
    return v;
  }

  const store = new Map(); // "col/id" -> data
  const add = (col, docs) => Object.entries(docs || {}).forEach(([id, d]) => store.set(col + "/" + id, resolve(d)));
  add("jobs", seed.jobs);
  add("companies", seed.companies);
  add("recruiters", seed.recruiters);
  add("meta", seed.meta);

  const listeners = new Set();
  const notify = () => listeners.forEach((l) => { try { l(); } catch (e) { console.error(e); } });
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function collectionSnap(name) {
    const docs = [];
    store.forEach((data, key) => {
      const i = key.indexOf("/");
      if (key.slice(0, i) === name) docs.push({ id: key.slice(i + 1), data: () => clone(data) });
    });
    return { docs, size: docs.length, empty: !docs.length };
  }
  function docSnap(path) {
    const data = store.get(path);
    return { id: path.split("/").pop(), exists: data !== undefined, data: () => (data === undefined ? undefined : clone(data)) };
  }
  function watch(fn) {
    listeners.add(fn);
    queueMicrotask(fn);
    return () => listeners.delete(fn);
  }

  const db = {
    collection(name) {
      return {
        onSnapshot(cb) { return watch(() => cb(collectionSnap(name))); },
        async get() { return collectionSnap(name); },
      };
    },
    doc(path) {
      return {
        onSnapshot(cb) { return watch(() => cb(docSnap(path))); },
        async get() { return docSnap(path); },
        async set(data) { store.set(path, clone(data)); notify(); },
        async update(patch) {
          if (!store.has(path)) throw new Error("No document at " + path);
          store.set(path, { ...store.get(path), ...clone(patch) });
          notify();
        },
        async delete() { store.delete(path); notify(); },
      };
    },
  };

  // Demo job boards: the preview panel's requests for the fictional companies are answered
  // here, in each board's real response shape, from seed.postings ("<ats>/<slug>/<id>").
  // Requests for any other board go to the real network. FOR DEMOS AND TESTS ONLY.
  const postings = seed.postings || {};
  const demoSlugs = new Set(Object.keys(postings).map((k) => k.split("/").slice(0, 2).join("/")));
  const escHtml = (h) => String(h).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  function demoBoard(url) {
    let m = /^https:\/\/boards-api\.greenhouse\.io\/v1\/boards\/([^/]+)\/jobs\/([^/?]+)/.exec(url);
    if (m && demoSlugs.has("greenhouse/" + m[1])) {
      const h = postings[`greenhouse/${m[1]}/${m[2]}`];
      return h ? json(200, { id: Number(m[2]), content: escHtml(h) }) : json(404, { status: 404, error: "Job not found" });
    }
    m = /^https:\/\/api\.ashbyhq\.com\/posting-api\/job-board\/([^/?]+)/.exec(url);
    if (m && demoSlugs.has("ashby/" + m[1])) {
      const jobs = Object.entries(postings).filter(([k]) => k.startsWith(`ashby/${m[1]}/`)).map(([k, h]) => ({ id: k.split("/")[2], descriptionHtml: h }));
      return json(200, { jobs });
    }
    m = /^https:\/\/api\.lever\.co\/v0\/postings\/([^/]+)\/([^/?]+)/.exec(url);
    if (m && demoSlugs.has("lever/" + m[1])) {
      const p = postings[`lever/${m[1]}/${m[2]}`];
      return p ? json(200, typeof p === "string" ? { id: m[2], description: p, lists: [], additional: "" } : { id: m[2], ...p }) : json(404, { ok: false, error: "Document not found" });
    }
    return null;
  }
  const realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input && input.url;
    const demo = demoBoard(String(url || ""));
    if (demo) { await new Promise((r) => setTimeout(r, 120)); return demo; }
    if (!realFetch) throw new TypeError("fetch unavailable");
    return realFetch(input, init);
  };

  // Fake Gmail connector: read-only search_threads and batch_get_threads over seed.gmail.
  const gmail = seed.gmail ? resolve(seed.gmail) : null;
  const calls = (window.__RR_MCP_CALLS__ = []);
  const mcp = {
    async callTool(server, tool, input) {
      calls.push({ server, tool, input });
      if (server !== "Gmail") throw { code: "server_not_connected", server, message: "Not connected" };
      if (gmail.error) throw { code: gmail.error, server, message: "Demo error" };
      if (tool === "search_threads") return { content: [], payload: { threads: clone(gmail.threads || []) } };
      if (tool === "batch_get_threads") {
        const full = gmail.full || {};
        const threads = (input.threadIds || []).map((id) => full[id] || (gmail.threads || []).find((t) => t.id === id)).filter(Boolean);
        return { content: [], payload: { threads: clone(threads) } };
      }
      throw { code: "not_in_manifest", server, message: "Tool not allowed" };
    },
  };

  window.claude = window.claude || {};
  window.claude.use = async (cap) => (cap === "db" ? db : cap === "mcp" && gmail ? mcp : null);
  window.__RR_DEMO__ = true;
})();
