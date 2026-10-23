/* Role Radar posting preview: find a role's public job-board API and read its description.
 * The page calls these when you open a role's preview panel. Text comes straight from the
 * company's own board (Greenhouse, Ashby or Lever), word for word, and is never stored.
 *
 *   postingSource(job, companies) -> {ats, slug, id, eu} or null (no public API for this source)
 *   apiUrl(src)                   -> the public JSON endpoint to fetch
 *   extractHtml(src, data)        -> the description as HTML, or "" if the posting isn't there
 *   sanitizeHtml(html, doc)       -> a safe DocumentFragment (browser only: needs DOMParser)
 *
 * Classic script: sets window.RoleRadarPosting in the browser, module.exports in Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RoleRadarPosting = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const ATS = ["greenhouse", "ashby", "lever"];
  const ATS_LABEL = { greenhouse: "Greenhouse", ashby: "Ashby", lever: "Lever" };
  const lc = (s) => String(s == null ? "" : s).toLowerCase().trim();

  // Posting links the scan and manual adds store, newest board domains first.
  const URL_RULES = [
    { ats: "greenhouse", re: /^https?:\/\/(?:job-boards|boards)(\.eu)?\.greenhouse\.io\/([^/?#]+)\/jobs\/(\d+)/i },
    { ats: "greenhouse", re: /^https?:\/\/(?:job-boards|boards)(\.eu)?\.greenhouse\.io\/embed\/job_app\?(?=.*\bfor=([^&#]+))(?=.*\btoken=(\d+))/i },
    { ats: "ashby", re: /^https?:\/\/jobs()\.ashbyhq\.com\/([^/?#]+)\/([0-9a-f-]{36})/i },
    { ats: "lever", re: /^https?:\/\/jobs(\.eu)?\.lever\.co\/([^/?#]+)\/([0-9a-f-]{36})/i },
  ];
  function fromUrl(url) {
    const u = String(url || "").trim();
    for (const r of URL_RULES) {
      const m = r.re.exec(u);
      if (!m) continue;
      let slug;
      try { slug = decodeURIComponent(m[2]); } catch { return null; } // a broken %-escape: no preview, no crash
      return { ats: r.ats, slug, id: m[3], eu: !!m[1] };
    }
    return null;
  }

  // The scan stores jobs as jobs/<ats>-<jobId> and companies as companies/<ats>-<slug>.
  function postingSource(job, companies) {
    if (!job) return null;
    const byUrl = fromUrl(job.url);
    if (byUrl) return byUrl;
    const ats = lc(job.ats || job.source);
    if (!ATS.includes(ats)) return null;
    const docId = String(job._id || "");
    const id = docId.startsWith(ats + "-") ? docId.slice(ats.length + 1) : "";
    let slug = "";
    const cid = String(job.companyId || "");
    if (cid.startsWith(ats + "-")) slug = cid.slice(ats.length + 1);
    if (!slug && Array.isArray(companies)) {
      const c = companies.find((x) => x && lc(x.ats) === ats && x.slug && lc(x.name) === lc(job.company));
      if (c) slug = String(c.slug);
    }
    return id && slug ? { ats, slug, id, eu: false } : null;
  }

  function apiUrl(src) {
    const s = encodeURIComponent(src.slug), i = encodeURIComponent(src.id);
    if (src.ats === "greenhouse") return `https://boards-api.greenhouse.io/v1/boards/${s}/jobs/${i}`;
    if (src.ats === "ashby") return `https://api.ashbyhq.com/posting-api/job-board/${s}`;
    if (src.ats === "lever") return `https://api${src.eu ? ".eu" : ""}.lever.co/v0/postings/${s}/${i}?mode=json`;
    return "";
  }

  // Greenhouse escapes its HTML once (&lt;p&gt;...), so it has to be decoded before parsing.
  const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  function decodeEntities(s) {
    return String(s || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === "#") {
        const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
      }
      const v = NAMED[e.toLowerCase()];
      return v === undefined ? m : v;
    });
  }
  const escText = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function extractHtml(src, data) {
    if (!src || !data || typeof data !== "object") return "";
    if (src.ats === "greenhouse") return typeof data.content === "string" ? decodeEntities(data.content) : "";
    if (src.ats === "ashby") {
      const job = (Array.isArray(data.jobs) ? data.jobs : []).find((j) => j && String(j.id) === String(src.id));
      return job ? String(job.descriptionHtml || (job.descriptionPlain ? `<p>${escText(job.descriptionPlain)}</p>` : "")) : "";
    }
    if (src.ats === "lever") {
      const lists = (Array.isArray(data.lists) ? data.lists : []).map((l) => `${l && l.text ? `<h3>${escText(l.text)}</h3>` : ""}<ul>${(l && l.content) || ""}</ul>`).join("");
      const body = data.description || (data.descriptionPlain ? `<p>${escText(data.descriptionPlain)}</p>` : "");
      return body || lists ? String(body) + lists + String(data.additional || "") : "";
    }
    return "";
  }

  // Keep the posting's words and basic structure; drop scripts, styles, images, forms,
  // inline styles and event handlers. Links stay only when they are http(s).
  const KEEP = new Set("P BR UL OL LI STRONG B EM I U H1 H2 H3 H4 H5 H6 BLOCKQUOTE A DIV SPAN SECTION TABLE THEAD TBODY TR TD TH HR SUB SUP CODE PRE SMALL".split(" "));
  const DROP = new Set("SCRIPT STYLE IFRAME FRAME OBJECT EMBED FORM INPUT BUTTON SELECT TEXTAREA IMG PICTURE SVG MATH LINK META NOSCRIPT TEMPLATE VIDEO AUDIO SOURCE CANVAS HEAD TITLE BASE".split(" "));
  function sanitizeHtml(html, doc) {
    const out = doc.createDocumentFragment();
    const parsed = new DOMParser().parseFromString(String(html || ""), "text/html");
    const copy = (from, to) => {
      for (const n of Array.from(from.childNodes)) {
        if (n.nodeType === 3) { to.appendChild(doc.createTextNode(n.nodeValue)); continue; }
        if (n.nodeType !== 1) continue;
        const tag = n.tagName.toUpperCase();
        if (DROP.has(tag)) continue;
        if (!KEEP.has(tag)) { copy(n, to); continue; }
        const el = doc.createElement(tag.toLowerCase());
        if (tag === "A") {
          const href = String(n.getAttribute("href") || "").trim();
          if (/^https?:\/\//i.test(href)) { el.setAttribute("href", href); el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener noreferrer"); }
        }
        copy(n, el);
        to.appendChild(el);
      }
    };
    copy(parsed.body, out);
    return out;
  }

  return { ATS, ATS_LABEL, fromUrl, postingSource, apiUrl, decodeEntities, extractHtml, sanitizeHtml };
});
