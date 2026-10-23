/* Role Radar alerts: the `alerts:` block in criteria.yaml, as code.
 * Decides which events deserve a notification, how loud, on which channels, and when
 * (quiet hours hold quiet alerts until morning; loud ones can break through).
 *
 *   Events:  recruiter_email  a person emails or replies about work
 *            status_change    a role moves to a status (screen, interviewing, offer, rejected...)
 *            new_role         the scan adds a role (carries its 0-100 score)
 *            follow_up_due    an application's follow-up date has arrived
 *   Levels:  loud   every channel in `channels` (push first), right away unless quiet hours hold it
 *            quiet  one line in the next summary, no push
 *            off    nothing
 *
 * The page uses it for the Alerts preview; the alert watcher follows the same rules.
 * Classic script: sets window.RoleRadarAlerts in the browser, module.exports in Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RoleRadarAlerts = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const EVENTS = ["recruiter_email", "status_change", "new_role", "follow_up_due"];
  const LEVELS = ["loud", "quiet", "off"];
  const CHANNELS = ["push", "thread", "email"];

  // Used when criteria.yaml has no alerts block: recruiters and interviews are loud, the rest quiet.
  const DEFAULT_RULES = [
    { id: "recruiter_email", when: "recruiter_email", level: "loud", remind_after_hours: [4] },
    { id: "interview", when: "status_change", to: ["screen", "interviewing", "offer"], level: "loud" },
    { id: "rejection", when: "status_change", to: ["rejected"], level: "quiet" },
    { id: "strong_match", when: "new_role", min_score: 80, level: "loud" },
    { id: "follow_up", when: "follow_up_due", level: "quiet" },
  ];
  const DEFAULTS = { channels: ["push", "thread"], quiet_hours: null, rules: DEFAULT_RULES };

  const arr = (a) => (Array.isArray(a) ? a : a == null || a === "" ? [] : [a]);
  const lc = (s) => String(s == null ? "" : s).toLowerCase().trim();

  /** "07:30" → minutes after midnight, or null. */
  function minutesOf(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm == null ? "" : hhmm).trim());
    if (!m) return null;
    const h = Number(m[1]), mm = Number(m[2]);
    return h > 23 || mm > 59 ? null : h * 60 + mm;
  }

  /** The alerts block with defaults filled in and junk dropped. Never throws. */
  function normalize(spec) {
    const a = spec && typeof spec === "object" && spec.alerts && typeof spec.alerts === "object" ? spec.alerts : {};
    const channels = arr(a.channels).map(lc).filter((c) => CHANNELS.includes(c));
    let quiet = null;
    if (a.quiet_hours && typeof a.quiet_hours === "object") {
      const start = minutesOf(a.quiet_hours.start), end = minutesOf(a.quiet_hours.end);
      if (start !== null && end !== null && start !== end)
        quiet = { start, end, tz: a.quiet_hours.tz ? String(a.quiet_hours.tz) : "", loud_breaks_through: a.quiet_hours.loud_breaks_through === true };
    }
    const source = Array.isArray(a.rules) ? a.rules : DEFAULT_RULES;
    // Ids fall back to the rule's position in the list as written, so a message can point at it.
    const rules = source
      .map((r, i) => [r, i])
      .filter(([r]) => r && typeof r === "object" && EVENTS.includes(lc(r.when)))
      .map(([r, i]) => {
        const level = LEVELS.includes(lc(r.level)) ? lc(r.level) : "loud";
        const rule = { id: r.id ? String(r.id) : lc(r.when) + "-" + (i + 1), when: lc(r.when), level };
        const to = arr(r.to).map(lc).filter(Boolean);
        if (to.length) rule.to = to;
        const min = Number(r.min_score);
        if (r.min_score != null && r.min_score !== "" && Number.isFinite(min)) rule.min_score = min;
        const remind = arr(r.remind_after_hours).map(Number).filter((n) => Number.isFinite(n) && n > 0).sort((x, y) => x - y);
        if (remind.length) rule.remind_after_hours = remind;
        return rule;
      });
    return { channels: channels.length ? channels : DEFAULTS.channels.slice(), quiet_hours: quiet, rules };
  }

  /** Does this rule fire for this event? */
  function matches(rule, ev) {
    if (!ev || lc(ev.type) !== rule.when) return false;
    if (rule.to && !rule.to.includes(lc(ev.to))) return false;
    if (rule.min_score != null && !(Number(ev.score) >= rule.min_score)) return false;
    return true;
  }

  /** Minutes after midnight for a Date in a time zone ("" = the Date's own local time). */
  function clockMinutes(date, tz) {
    if (tz) {
      try {
        const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
        const get = (t) => Number((parts.find((p) => p.type === t) || {}).value);
        if (Number.isFinite(get("hour"))) return get("hour") * 60 + get("minute");
      } catch (_) { /* unknown zone: fall back to local time */ }
    }
    return date.getHours() * 60 + date.getMinutes();
  }

  /** True when `date` falls inside quiet hours (which may wrap past midnight). */
  function inQuietHours(date, quiet) {
    if (!quiet) return false;
    const m = clockMinutes(date, quiet.tz);
    return quiet.start < quiet.end ? m >= quiet.start && m < quiet.end : m >= quiet.start || m < quiet.end;
  }

  /**
   * Decide what to send for a list of events. The first matching rule wins.
   * Returns [{event, rule, level, channels, held}] for every event that alerts (level off is left out);
   * held = true when quiet hours delay it to the end of quiet hours.
   */
  function evaluate(events, spec, now) {
    const cfg = normalize(spec);
    const at = now instanceof Date ? now : new Date(now == null ? Date.now() : now);
    const quietNow = inQuietHours(at, cfg.quiet_hours);
    const out = [];
    arr(events).forEach((ev) => {
      const rule = cfg.rules.find((r) => matches(r, ev));
      if (!rule || rule.level === "off") return;
      const loud = rule.level === "loud";
      const held = quietNow && !(loud && cfg.quiet_hours.loud_breaks_through);
      out.push({ event: ev, rule, level: rule.level, channels: loud ? cfg.channels.slice() : ["summary"], held });
    });
    return out;
  }

  const STATUS_WORDS = { screen: "a screen", interviewing: "interviews", offer: "an offer", rejected: "a rejection", applied: "applied" };

  /** One plain sentence for a rule, for the Criteria tab. */
  function describe(rule) {
    let what;
    if (rule.when === "recruiter_email") what = "A recruiter or hiring manager emails or replies";
    else if (rule.when === "status_change") what = "A role moves to " + (rule.to ? rule.to.map((s) => STATUS_WORDS[s] || s).join(" or ") : "any new status");
    else if (rule.when === "new_role") what = "The scan finds a role" + (rule.min_score != null ? " scoring " + rule.min_score + "+" : "");
    else what = "A follow-up date arrives";
    const how = rule.level === "loud" ? "alert right away" : rule.level === "quiet" ? "add to the summary" : "do nothing";
    const remind = rule.remind_after_hours ? ", remind after " + rule.remind_after_hours.join(" and ") + "h without a reply" : "";
    return what + ": " + how + remind + ".";
  }

  /** "22:00"-style label for minutes after midnight. */
  const clock = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");

  return { normalize, matches, evaluate, inQuietHours, describe, clock, EVENTS, LEVELS, CHANNELS, DEFAULT_RULES };
});
