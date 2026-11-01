import assert from "node:assert/strict";
import test from "node:test";

import {
  PROBES,
  atsLinksInPage,
  confidenceFor,
  parseCsvRows,
  parseSeedCsv,
  robotsAllows,
  slugCandidates,
  unsupportedSystemsInPage,
} from "./discovery.ts";

function probe(type: string) {
  const found = PROBES.find((item) => item.type === type);
  assert.ok(found, type);
  return found;
}

test("slug candidates come from the name and the domain", () => {
  assert.deepEqual(slugCandidates("Urban Company", "urbancompany.com"), ["urbancompany", "urban-company"]);
  assert.deepEqual(slugCandidates("Zepto", "zeptonow.com"), ["zepto", "zeptonow"]);
  assert.deepEqual(slugCandidates("Juspay Technologies", "www.juspay.in"), [
    "juspaytechnologies",
    "juspay-technologies",
    "juspay",
  ]);
  assert.deepEqual(slugCandidates("M2P Fintech", "m2pfintech.com"), ["m2pfintech", "m2p-fintech"]);
});

test("a Greenhouse board counts its India roles and samples one", () => {
  const summary = probe("greenhouse").read({
    jobs: [
      { title: "Staff Engineer", location: { name: "San Francisco, CA" } },
      { title: "Backend Engineer", location: { name: "Bengaluru, India" } },
    ],
  });
  assert.deepEqual(summary, {
    roleCount: 2,
    indiaRoles: 1,
    sampleTitle: "Backend Engineer",
    sampleLocation: "Bengaluru, India",
  });
});

test("Lever, Workable, SmartRecruiters and Recruitee read their own shapes", () => {
  assert.equal(probe("lever").read([{ text: "SDE", categories: { location: "Pune" } }])?.indiaRoles, 1);
  assert.equal(probe("workable").read({ jobs: [{ title: "PM", city: "Gurugram", country: "India" }] })?.indiaRoles, 1);
  assert.equal(
    probe("smartrecruiters").read({ content: [{ name: "Analyst", location: { city: "Mumbai", country: "in" } }] })
      ?.indiaRoles,
    1,
  );
  assert.equal(probe("recruitee").read({ offers: [{ title: "Designer", location: "Berlin", country_code: "DE" }] })?.indiaRoles, 0);
});

test("a Keka board counts India by country code even when the city is just 'India'", () => {
  const summary = probe("keka").read([
    { title: "SDE - QA", jobLocations: [{ name: "India", city: "India", countryName: "", countryCode: "IN" }] },
    { title: "Account Executive", jobLocations: [{ name: "Dubai", city: "Dubai", countryName: "UAE", countryCode: "AE" }] },
  ]);
  assert.equal(summary?.roleCount, 2);
  assert.equal(summary?.indiaRoles, 1);
  assert.equal(probe("keka").read("<html>Keka HR</html>"), null);
});

test("an empty or foreign payload is not a hit", () => {
  assert.equal(probe("smartrecruiters").read({ totalFound: 0, content: [] })?.roleCount, 0);
  assert.equal(probe("greenhouse").read({ error: "not found" }), null);
  assert.equal(probe("lever").read({ ok: false, error: "Document not found" }), null);
});

test("careers pages reveal the ATS and its slug", () => {
  const html = `
    <a href="https://jobs.lever.co/acme/123">Apply</a>
    <script src="https://boards.greenhouse.io/embed/job_board/js?for=acmeindia"></script>
    <iframe src="https://job-boards.greenhouse.io/acme"></iframe>
    <a href="https://jobs.ashbyhq.com/Acme%20Labs">Ashby</a>
    <a href="https://acme.wd3.myworkdayjobs.com/en-US/AcmeCareers/job/123">Workday</a>
    <a href="https://acme.keka.com/careers/">Keka</a>
    <a href="https://apply.workable.com/api/v1/whatever">ignored</a>`;
  assert.deepEqual(atsLinksInPage(html), [
    { type: "greenhouse", slug: "acmeindia" },
    { type: "greenhouse", slug: "acme" },
    { type: "lever", slug: "acme" },
    { type: "ashby", slug: "Acme Labs" },
    { type: "workday", slug: "wd3/acme/AcmeCareers" },
    { type: "keka", slug: "acme" },
  ]);
});

test("systems the board cannot read yet are named", () => {
  assert.deepEqual(unsupportedSystemsInPage('<a href="https://acme.darwinbox.in/ms/candidate">Jobs</a>'), ["Darwinbox"]);
  assert.deepEqual(unsupportedSystemsInPage("<p>No ATS here</p>"), []);
});

test("robots.txt rules: longest match wins, Allow wins a tie, other agents are ignored", () => {
  const robots = [
    "User-agent: Googlebot",
    "Disallow: /",
    "",
    "User-agent: *",
    "Disallow: /careers",
    "Allow: /careers/open-roles",
    "Disallow: /*.pdf$",
  ].join("\n");
  assert.equal(robotsAllows(robots, "/careers"), false);
  assert.equal(robotsAllows(robots, "/careers/open-roles"), true);
  assert.equal(robotsAllows(robots, "/jobs"), true);
  assert.equal(robotsAllows(robots, "/brochure.pdf"), false);
  assert.equal(robotsAllows("User-agent: *\nDisallow:", "/careers"), true);
  assert.equal(robotsAllows("User-agent: JobRadar\nDisallow: /", "/careers"), false);
});

test("confidence drops to low when no role is in India", () => {
  const summary = { roleCount: 3, indiaRoles: 0, sampleTitle: "SDE", sampleLocation: "London" };
  assert.equal(confidenceFor("api", summary), "low");
  assert.equal(confidenceFor("api", { ...summary, indiaRoles: 2 }), "high");
  assert.equal(confidenceFor("careers_page", { ...summary, indiaRoles: 2 }), "medium");
});

test("CSV rows keep quoted commas and quotes", () => {
  assert.deepEqual(parseCsvRows('name,domain,reason\nAcme,acme.io,"uses Darwinbox, Keka"\nB,b.in,"said ""no"""\n'), [
    ["name", "domain", "reason"],
    ["Acme", "acme.io", "uses Darwinbox, Keka"],
    ["B", "b.in", 'said "no"'],
  ]);
});

test("the seed CSV skips its header, blanks and comments", () => {
  assert.deepEqual(parseSeedCsv("name,domain\n# fintech\nZerodha,zerodha.com\n\n\"Acme, Inc\",Acme.io\n"), [
    { name: "Zerodha", domain: "zerodha.com" },
    { name: "Acme, Inc", domain: "acme.io" },
  ]);
});
