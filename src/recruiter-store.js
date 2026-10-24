/* Role Radar recruiter store: the one place the page reads and writes recruiter records.
 * Recruiters are private to the page's owner. The artifact database enforces it with an
 * owner-only rule on the "recruiters" path (RULES, declared in app/capabilities.json when the
 * page is published); this store adds the page side: a viewer who isn't the owner never
 * asks the database for recruiters and never sees the tab.
 *
 *   mode   owner    the platform says this viewer owns the page: read and write
 *          viewer   anyone else the page is shared with: nothing is read, writes refuse
 *          unknown  the platform can't say (no `user` answer): read, and let the rule decide
 *          off      the public demo, or no database: nothing at all
 *
 * Design and deploy checklist: docs/private-recruiters.md.
 * Classic script: sets window.RoleRadarRecruiters in the browser, module.exports in Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RoleRadarRecruiters = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PATH = "recruiters";
  const RULES = [{ path: PATH, read: "owner", write: "owner" }];

  function create({ db = null, user = null, publicView = false } = {}) {
    let mode = "pending";
    const store = {
      get mode() { return mode; },
      get visible() { return mode === "owner" || mode === "unknown"; },
      get canWrite() { return mode === "owner" || mode === "unknown"; },
      async init() {
        if (publicView || !db) return (mode = "off");
        if (!user || typeof user.isOwner !== "function") return (mode = "unknown");
        try {
          const own = await user.isOwner();
          mode = own === true ? "owner" : own === false ? "viewer" : "unknown";
        } catch (_) {
          mode = "unknown";
        }
        return mode;
      },
      /** Calls cb(list) now and on every change. Viewers and the public demo get [] once. */
      subscribe(cb, onError) {
        if (!store.visible) { cb([]); return () => {}; }
        return db.collection(PATH).onSnapshot((s) => cb(s.docs.map((d) => ({ ...d.data(), _id: d.id }))), onError || (() => {}));
      },
      async add(key, doc) { guard(); return db.doc(PATH + "/" + key).set(doc); },
      async update(key, patch) { guard(); return db.doc(PATH + "/" + key).update(patch); },
    };
    function guard() { if (!store.canWrite) throw new Error("Only the page's owner can change recruiters."); }
    return store;
  }

  return { create, PATH, RULES };
});
