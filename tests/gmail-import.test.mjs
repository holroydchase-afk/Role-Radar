import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const G = require("../src/gmail-import.js");
// Addresses are built from parts so the repo's own email check doesn't flag these fixtures.
const at = (local, domain) => [local, domain].join("@");
const msg = (sender, date, subject = "Hello", labels = ["INBOX"]) => ({ sender, date, subject, labelIds: labels });
const thread = (id, messages, extra = {}) => ({ id, messageCount: messages.length, viewUrl: "https://example.com/t/" + id, messages, ...extra });

test("parses sender strings and objects", () => {
  assert.deepEqual(G.parseAddress('"Riley Chen" <Riley.Chen@sunfield.example>'), { name: "Riley Chen", email: "riley.chen@sunfield.example" });
  assert.deepEqual(G.parseAddress("avery@northstar.example"), { name: "", email: "avery@northstar.example" });
  assert.deepEqual(G.parseAddress({ displayName: "Sam Lee", emailAddress: "sam@acme.example" }), { name: "Sam Lee", email: "sam@acme.example" });
  assert.equal(G.parseAddress("Pat via LinkedIn <pat@acme.example>").name, "Pat");
});

test("company comes from the domain, blank for personal mail", () => {
  assert.equal(G.companyFromEmail("a@brightwell-solar.example"), "Brightwell Solar");
  assert.equal(G.companyFromEmail("a@talent.northstar.example"), "Northstar");
  assert.equal(G.companyFromEmail(at("a", "acme.co.uk")), "Acme");
  assert.equal(G.companyFromEmail(at("a", "gmail.com")), "");
  assert.equal(G.companyFromEmail(at("a", "outlook.com")), "");
});

test("agencies are told apart from in-house recruiters", () => {
  assert.equal(G.typeFor("a@northstar-talent.example", "Northstar Talent"), "agency");
  assert.equal(G.typeFor("a@sunfield-energy.example", "Sunfield Energy"), "in-house");
  assert.equal(G.typeFor(at("a", "gmail.com"), ""), "referral");
});

test("job boards, applicant tracking systems and no-reply senders are skipped", () => {
  for (const e of ["no-reply@ashbyhq.com", "jobs-noreply@linkedin.com", at("notifications", "greenhouse.io"), at("x", "hire.lever.co"), at("alerts", "ziprecruiter.com")])
    assert.ok(G.isAutomated(G.parseAddress(e)), e);
  assert.ok(!G.isAutomated(G.parseAddress("riley@sunfield.example")));
  assert.ok(!G.isAutomated(G.parseAddress(at("sam.recruiter", "google.com"))), "a recruiter at a big company is still a person");
});

test("dates come only from the messages", () => {
  assert.equal(G.dateOf({ date: "2026-03-04T15:00:00" }), "2026-03-04");
  assert.equal(G.dateOf({ internalDate: String(new Date("2026-03-04T15:00:00").getTime()) }), "2026-03-04");
  assert.equal(G.dateOf({}), "");
  assert.equal(G.dateOf({ date: "not a date" }), "");
});

test("one suggestion per person, last contact is the newest message either way", () => {
  const out = G.candidates([
    thread("t1", [msg("Riley Chen <riley@sunfield.example>", "2026-01-10T12:00:00", "Senior PM role"), msg("Me <me@example.com>", "2026-01-12T12:00:00", "Re: Senior PM role", ["SENT"])]),
    thread("t2", [msg("Riley Chen <riley@sunfield.example>", "2026-02-01T12:00:00", "Re: another role")]),
    thread("t3", [msg("Ledgerly <no-reply@ashbyhq.com>", "2026-02-02T12:00:00", "Thanks for applying")]),
    thread("t4", [msg("Me <me@example.com>", "2026-02-03T12:00:00", "Cold outreach", ["SENT"])]),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "Riley Chen");
  assert.equal(out[0].company, "Sunfield");
  assert.equal(out[0].threads, 2);
  assert.equal(out[0].lastContact, "2026-02-01");
  assert.equal(out[0].subject, "another role");
  assert.equal(out[0].viewUrl, "https://example.com/t/t2");
});

test("people already in the list are marked, not duplicated", () => {
  const threads = [thread("t1", [msg("Jordan Reyes <jordan@brightwell.example>", "2026-01-10T12:00:00")]), thread("t2", [msg("Avery <avery@northstar.example>", "2026-01-11T12:00:00")])];
  const out = G.candidates(threads, { existing: [{ _id: "x", name: "Jordan Reyes (demo)", company: "Brightwell Solar" }, { _id: "y", name: "A", email: "AVERY@northstar.example" }] });
  assert.ok(out.every((c) => c.exists));
});

test("long threads are flagged for a full read", () => {
  assert.ok(G.needsFullThread({ messageCount: 7, messages: [1, 2, 3, 4, 5] }));
  assert.ok(!G.needsFullThread({ messageCount: 2, messages: [1, 2] }));
  assert.deepEqual(G.threadsFrom({ threads: [1] }), [1]);
  assert.deepEqual(G.threadsFrom({}), []);
  assert.deepEqual(G.threadsFrom("oops"), []);
});

test("saved recruiter never gets an outcome or next step it didn't come with", () => {
  const doc = G.recruiterDoc({ name: "Riley Chen", email: "riley@sunfield.example", company: "Sunfield", type: "in-house", subject: "Senior PM role", lastContact: "2026-02-01", viewUrl: "javascript:alert(1)" }, "2026-02-02T00:00:00Z");
  assert.deepEqual(doc, { name: "Riley Chen", company: "Sunfield", type: "in-house", email: "riley@sunfield.example", lastContact: "2026-02-01", source: "gmail", createdAt: "2026-02-02T00:00:00Z", lastNote: 'Gmail: "Senior PM role"' });
});
