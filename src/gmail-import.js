/* Role Radar Gmail import: turns Gmail search results into recruiter suggestions.
 * The page calls the viewer's Gmail connector (read-only search_threads), passes the threads
 * here, shows the suggestions for review, and saves only the ones the viewer picks.
 *
 * Rules:
 *   - Dates come only from the messages themselves; nothing is guessed.
 *   - Messages the viewer sent (SENT label), no-reply senders and job boards / applicant
 *     tracking systems are skipped: they are not people.
 *   - Company comes from the sender's email domain, left blank for personal mail (gmail.com...),
 *     and personal mail is typed "referral"; the viewer can change either.
 *   - Outcomes and next steps are never filled in; the viewer adds them.
 *
 * Classic script: sets window.RoleRadarGmail in the browser, module.exports in Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RoleRadarGmail = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_QUERY = '(recruiter OR recruiting OR "talent acquisition" OR "your background" OR "your experience" OR "a role" OR opportunity) newer_than:2y -from:me -category:promotions -category:social -category:forums';

  const FREE_MAIL = /^(gmail|googlemail|yahoo|ymail|outlook|hotmail|live|msn|icloud|me|mac|aol|proton|protonmail|pm|fastmail|gmx|zoho)\./i;
  const AUTOMATED_LOCAL = /^(no-?reply|do-?not-?reply|notifications?|alerts?|mailer(-daemon)?|jobs?(-noreply)?|careers?|talent-?noreply|team|hello|info|support|news(letter)?|updates?|digest)([+.-]|$)/i;
  const BOARDS = /(^|\.)(linkedin|indeed|ziprecruiter|glassdoor|greenhouse|greenhouse-mail|lever|hire\.lever|ashbyhq|myworkday|workday|smartrecruiters|icims|jobvite|bamboohr|workable|himalayas|wellfound|angel|otta|welcometothejungle|builtin|climatebase|hired|dice|monster|careerbuilder|simplyhired|jobot|calendly)\.[a-z.]+$/i;
  const AGENCY = /(search|talent|staffing|recruit|partners|consult|hire|hiring|executive|placement|personnel)/i;

  const arr = (v) => (Array.isArray(v) ? v : []);
  const str = (v) => (typeof v === "string" ? v : "");

  function parseAddress(v) {
    if (v && typeof v === "object") {
      const email = str(v.email || v.emailAddress || v.address).trim().toLowerCase();
      return { name: cleanName(str(v.name || v.displayName)), email };
    }
    const s = str(v).trim();
    const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(s);
    if (m) return { name: cleanName(m[1]), email: m[2].trim().toLowerCase() };
    return { name: "", email: /@/.test(s) ? s.toLowerCase() : "" };
  }

  function cleanName(n) {
    return str(n).replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+via\s+.*$/i, "").replace(/\s+/g, " ").trim();
  }

  const titleCase = (s) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

  function nameFromEmail(email) {
    const local = str(email).split("@")[0].replace(/\+.*$/, "");
    if (!/[._-]/.test(local)) return "";
    return titleCase(local.replace(/[._-]+/g, " ").replace(/\d+/g, "").trim());
  }

  function domainOf(email) { return str(email).split("@")[1] || ""; }

  function companyFromEmail(email) {
    const d = domainOf(email).toLowerCase();
    if (!d || FREE_MAIL.test(d)) return "";
    const labels = d.split(".");
    // drop the TLD (and a second-level country part like co.uk), then any subdomains
    const twoPart = labels.length > 2 && /^(co|com|org|net|ac|gov)$/.test(labels[labels.length - 2]);
    const core = labels[labels.length - (twoPart ? 3 : 2)] || labels[0];
    return titleCase(core.replace(/-/g, " "));
  }

  function isAutomated(addr) {
    const email = str(addr && addr.email);
    if (!email) return true;
    const [local, domain] = email.split("@");
    return AUTOMATED_LOCAL.test(local) || BOARDS.test(domain || "");
  }

  // Personal mail (no company) is usually a friend or former colleague making an intro.
  function typeFor(email, company) {
    if (!company) return "referral";
    return AGENCY.test(domainOf(email)) || AGENCY.test(company) ? "agency" : "in-house";
  }

  function pad(n) { return String(n).padStart(2, "0"); }
  /** "YYYY-MM-DD" in the viewer's time zone, or "" when the message has no usable date. */
  function dateOf(msg) {
    const raw = msg && (msg.date ?? msg.internalDate ?? msg.timestamp);
    if (raw == null || raw === "") return "";
    const d = typeof raw === "number" || /^\d{10,13}$/.test(String(raw)) ? new Date(Number(raw) < 1e12 ? Number(raw) * 1000 : Number(raw)) : new Date(raw);
    if (isNaN(d)) return "";
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function cleanSubject(s) {
    return str(s).replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, "").replace(/\s+/g, " ").trim().slice(0, 90);
  }

  function messagesOf(t) { return arr(t && (t.messages || t.messageList)); }
  const isSent = (m) => arr(m && (m.labelIds || m.label_ids)).includes("SENT");

  /** Threads from a search_threads or batch_get_threads payload, whatever it is wrapped in. */
  function threadsFrom(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object") return arr(payload.threads || payload.items || payload.results);
    return [];
  }

  /** True when the search preview left out some of the thread's messages (it shows the oldest 5). */
  function needsFullThread(t) {
    const n = Number(t && t.messageCount);
    return n > messagesOf(t).length;
  }

  // Accents fold to plain letters (José → jose); names with no Latin letters fall back to the address.
  const slug = (s) => str(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

  function existingIndex(existing) {
    const byEmail = new Set(), byKey = new Set(), byName = new Set();
    for (const r of arr(existing)) {
      if (r.email) byEmail.add(String(r.email).toLowerCase());
      if (r._id) byKey.add(r._id);
      if (r.name) byName.add(cleanName(r.name).toLowerCase());
    }
    return { byEmail, byKey, byName };
  }

  /**
   * One suggestion per person, newest contact first:
   * {key, name, email, company, type, subject, lastContact, threads, viewUrl, exists}
   */
  function candidates(threads, { existing = [] } = {}) {
    const idx = existingIndex(existing);
    const people = new Map();
    for (const t of arr(threads)) {
      const msgs = messagesOf(t);
      const inbound = msgs.filter((m) => !isSent(m));
      const from = inbound.map((m) => parseAddress(m.sender ?? m.from)).find((a) => !isAutomated(a));
      if (!from) continue;
      const dates = msgs.map(dateOf).filter(Boolean).sort();
      const last = dates[dates.length - 1] || "";
      const subject = cleanSubject((msgs.find((m) => m.subject) || {}).subject);
      const prev = people.get(from.email);
      if (prev) {
        prev.threads += 1;
        if (last > prev.lastContact) Object.assign(prev, { lastContact: last, subject: subject || prev.subject, viewUrl: str(t.viewUrl) || prev.viewUrl });
        if (!prev.name && from.name && !/@/.test(from.name)) prev.name = from.name;
        continue;
      }
      const name = (from.name && !/@/.test(from.name) ? from.name : "") || nameFromEmail(from.email);
      const company = companyFromEmail(from.email);
      people.set(from.email, { name, email: from.email, company, type: typeFor(from.email, company), subject, lastContact: last, threads: 1, viewUrl: str(t.viewUrl) });
    }
    return [...people.values()]
      .map((c) => {
        const key = (slug(c.name) ? slug(c.name + " " + c.company) : "") || slug(c.email.replace(/@.*/, "") + " " + (c.company || domainOf(c.email)));
        const exists = idx.byEmail.has(c.email) || idx.byKey.has(key) || (!!c.name && idx.byName.has(c.name.toLowerCase()));
        return { ...c, key, exists };
      })
      .sort((a, b) => b.lastContact.localeCompare(a.lastContact) || a.name.localeCompare(b.name));
  }

  /** The recruiters/<key> document saved for a picked suggestion. */
  function recruiterDoc(c, now = new Date().toISOString()) {
    const doc = { name: c.name || c.email, company: c.company, type: c.type, email: c.email, lastContact: c.lastContact, source: "gmail", createdAt: now };
    if (c.subject) doc.lastNote = `Gmail: "${c.subject}"`;
    if (/^https:\/\//.test(c.viewUrl || "")) doc.mailSearch = c.viewUrl;
    return doc;
  }

  return { DEFAULT_QUERY, parseAddress, companyFromEmail, isAutomated, typeFor, dateOf, threadsFrom, needsFullThread, candidates, recruiterDoc, slug };
});
