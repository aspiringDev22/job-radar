import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyFamily,
  classifyPlace,
  classifySeniority,
  decodeHtml,
  detectRemote,
  guessEmployment,
  guessSeniority,
  htmlToText,
  keepListedLocation,
  normalizeLocation,
  parsePostedAt,
  parseSalary,
} from "./normalize.ts";

test("htmlToText decodes Greenhouse entities and drops tags", () => {
  const text = htmlToText("&lt;h2&gt;Who we are&lt;/h2&gt;&lt;p&gt;Keep the platform safe.&lt;/p&gt;");
  assert.equal(text, "Who we are\nKeep the platform safe.");
});

test("decodeHtml leaves already decoded markup alone", () => {
  assert.equal(decodeHtml("<p>Hello</p>"), "<p>Hello</p>");
});

test("normalizeLocation collapses whitespace", () => {
  assert.equal(normalizeLocation("  New York,  NY  "), "New York, NY");
  assert.equal(normalizeLocation("   "), null);
  assert.equal(normalizeLocation("N/A"), null);
});

test("keepListedLocation keeps India and remote roles for global boards", () => {
  const nyc = { isRemote: false, locationRaw: "New York, NY", locationNormalized: "New York, NY" };
  const remote = { isRemote: true, locationRaw: "Remote - United States", locationNormalized: "Remote - United States" };
  const gurugram = { isRemote: false, locationRaw: "Gurugram, India", locationNormalized: "Gurugram, India" };
  assert.equal(keepListedLocation("india_or_remote", nyc), false);
  assert.equal(keepListedLocation("india_or_remote", remote), true);
  assert.equal(keepListedLocation("india_or_remote", gurugram), true);
  assert.equal(keepListedLocation("all", nyc), true);
});

test("detectRemote reads the location and an explicit flag", () => {
  assert.equal(detectRemote(["Remote - US"]), true);
  assert.equal(detectRemote(["New York, NY"]), false);
  assert.equal(detectRemote(["Hybrid"], true), true);
});

const REAL_TITLES: Array<[string, string, string]> = [
  ["2027 Intern - Research PhD Intern", "intern", "other"],
  ["4614-Intern- Event Marketing", "intern", "other"],
  ["Business Intel Engineer I, FinOps", "junior", "data"],
  ["Data Engineer I, CMT", "junior", "data"],
  ["Customer Support Engineer I", "junior", "other"],
  ["System Development Engineer I, Amazon", "junior", "other"],
  ["Quality Assurance Engineer I, Relay TAQ", "junior", "qa"],
  ["4486-Security Engineer II", "mid", "other"],
  ["Business Intelligence Engineer II", "mid", "data"],
  ["Applied Scientist II, Alexa International Tech", "mid", "ml"],
  ["4697- Software Development Engineer-II Backend", "mid", "backend"],
  ["Applied Scientist III, Alexa International", "senior", "ml"],
  ["4749 - Site Reliability Engineer III", "senior", "devops"],
  ["1003-Software Development Engineer-III Full Stack (MVC)", "senior", "fullstack"],
  ["4730-Software Development Engineer III (Full-Stack)", "senior", "fullstack"],
  ["4424 - Senior Legal Expert", "senior", "other"],
  ["3865-Senior Associate-Strategic Business Development", "senior", "other"],
  ["AI/ML Senior Technical Architect(Salesforce experience is a must)", "senior", "ml"],
  ["4689- Senior Product Designer", "senior", "design"],
  ["Senior UI / Full Stack Engineer (Frontend) | ReactJS & Java(8-12 years) | Bangalore, India", "senior", "fullstack"],
  ["Senior Technical Architect(React.js+Node.js)", "senior", "frontend"],
  ["1004-Staff Engineer-Full Stack (MVC)", "staff_plus", "fullstack"],
  ["4350- Staff Engineer - Backend (Gravity)", "staff_plus", "backend"],
  ["4195- Staff Engineer - Healthcare Interoperability (Gravity)", "staff_plus", "other"],
  ["4540-Staff Software Engineer", "staff_plus", "other"],
  ["4469-Principal Software Engineer - Data Platform (Iceberg/Trino)", "staff_plus", "data"],
  ["4769-Principal Software Architect", "staff_plus", "other"],
  ["Principal Software Engineer, Fulfillment by Amazon - IOS", "staff_plus", "mobile"],
  ["4301- Manager-IT", "manager", "other"],
  ["4407- Associate Director - Solution Architect", "manager", "other"],
  ["4463-Head of Thought Leadership", "manager", "other"],
  ["4145-Director/ Sr. Director- Growth Strategy (Payer & Public Sector)", "manager", "other"],
  ["4464 - Sr. /Manager - Product Operations", "manager", "other"],
  ["4410 Senior Product Manager-Public Health", "manager", "product"],
  ["4483- Senior Product Manager, AI", "manager", "product"],
  ["4622 -APM/Product Manager-Atlas", "manager", "product"],
  ["4809- Senior Manager- Product Designer", "manager", "design"],
  ["QA Program Manager, Global Shared Services (GSS) Quality, Content & Learning (QCL)", "manager", "qa"],
  ["Area Collection Manager - Manager - Lending Collections (Frontend)", "manager", "frontend"],
  ["Architect, Software Engineering - Frontend - Integration", "unknown", "frontend"],
  ["DevOps Engineer", "unknown", "devops"],
  ["Associate Architect - Site Reliability", "junior", "devops"],
  ["Backend Developer", "unknown", "backend"],
  ["20-Data Analyst", "unknown", "data"],
  ["SDET - Audio, SSG", "unknown", "qa"],
  ["QA Engineer - Networking L2/L3 Testing | 4 - 8 yrs | Bangalore, India", "unknown", "qa"],
  ["Full Stack Developer (Node.js & React.js)", "unknown", "fullstack"],
  ["Applied Scientist, Alexa International Tech", "unknown", "ml"],
  ["Account Executive", "unknown", "other"],
  ["4691- Lead Product Designer", "unknown", "design"],
];

test("classifySeniority and classifyFamily cover real titles", () => {
  assert.ok(REAL_TITLES.length >= 40);
  const seniorities = new Set(REAL_TITLES.map((row) => row[1]));
  const families = new Set(REAL_TITLES.map((row) => row[2]));
  for (const level of ["intern", "junior", "mid", "senior", "staff_plus", "manager", "unknown"]) {
    assert.ok(seniorities.has(level), level);
  }
  for (const family of ["backend", "frontend", "fullstack", "mobile", "data", "ml", "devops", "qa", "product", "design", "other"]) {
    assert.ok(families.has(family), family);
  }
  for (const [title, seniority, family] of REAL_TITLES) {
    assert.equal(classifySeniority(title), seniority, title);
    assert.equal(classifyFamily(title), family, title);
  }
});

test("classifyPlace aliases Indian cities and work mode", () => {
  assert.deepEqual(classifyPlace("Bangalore"), {
    city: "Bengaluru",
    region: null,
    country: "India",
    workMode: "onsite",
  });
  assert.deepEqual(classifyPlace("India - Haryana - Gurgaon"), {
    city: "Gurugram",
    region: "Delhi NCR",
    country: "India",
    workMode: "onsite",
  });
  assert.deepEqual(classifyPlace("Noida, Uttar Pradesh, India"), {
    city: "Noida",
    region: "Delhi NCR",
    country: "India",
    workMode: "onsite",
  });
  assert.deepEqual(classifyPlace("Bengaluru, Karnataka, IND"), {
    city: "Bengaluru",
    region: null,
    country: "India",
    workMode: "onsite",
  });
  assert.deepEqual(classifyPlace("Remote - United States"), {
    city: null,
    region: null,
    country: "United States",
    workMode: "remote",
  });
  assert.deepEqual(classifyPlace("Redwood City, CA (Hybrid)"), {
    city: null,
    region: null,
    country: null,
    workMode: "hybrid",
  });
  assert.equal(classifyPlace("Indianapolis, IN").country, null);
  assert.equal(classifyPlace("Bengaluru, India · Mumbai, India").city, "Bengaluru");
});

test("classifyPlace treats Indian cities and states as India, wherever they appear", () => {
  assert.equal(classifyPlace("Delhi HQ").country, "India");
  assert.equal(classifyPlace("Aligarh, Uttar Pradesh").country, "India");
  assert.equal(classifyPlace("Lucknow").country, "India");
  assert.equal(classifyPlace("Patna, Bihar").country, "India");
  assert.equal(classifyPlace("Bangalore, IN ; Pune, IN; Remote", true).country, "India");
  assert.equal(classifyPlace("London, United Kingdom · Bengaluru").country, "India");
  assert.equal(classifyPlace("Remote - Canada", true).country, null);
  assert.equal(classifyPlace("Amsterdam, North Holland, Netherlands").country, null);
  assert.equal(classifyPlace("San Mateo, CA, United States").country, "United States");
});

test("guessSeniority reads the title", () => {
  assert.equal(guessSeniority("Senior / Staff Fullstack Engineer"), "staff");
  assert.equal(guessSeniority("Engineering Intern"), "intern");
  assert.equal(guessSeniority("Head of Design"), "executive");
  assert.equal(guessSeniority("Account Executive"), "unknown");
  assert.equal(guessSeniority("Office Coordinator"), "unknown");
});

test("guessEmployment maps ATS labels", () => {
  assert.equal(guessEmployment("FullTime"), "full_time");
  assert.equal(guessEmployment("Permanent"), "full_time");
  assert.equal(guessEmployment("Internship"), "internship");
  assert.equal(guessEmployment(null), null);
});

test("parsePostedAt accepts ISO strings and millisecond timestamps", () => {
  const iso = parsePostedAt("2026-09-09T10:50:29-04:00");
  assert.ok(iso instanceof Date);
  const millis = parsePostedAt(1792767640768);
  assert.equal(millis?.getTime(), 1792767640768);
  assert.equal(parsePostedAt("not-a-date"), null);
});

test("parseSalary reads a dollar range", () => {
  assert.deepEqual(parseSalary("base range is $87,069-$124,385 plus equity"), {
    min: 87069,
    max: 124385,
    currency: "USD",
  });
  assert.deepEqual(parseSalary("₹18,00,000–₹24,00,000 a year"), {
    min: 1800000,
    max: 2400000,
    currency: "INR",
  });
  assert.deepEqual(parseSalary("no numbers here"), {
    min: null,
    max: null,
    currency: null,
  });
});
