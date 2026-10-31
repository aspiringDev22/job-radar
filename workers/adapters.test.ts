import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseAshbyBoard } from "./adapters/ashby.ts";
import { parseGreenhouseBoard } from "./adapters/greenhouse.ts";
import { parseLeverPostings } from "./adapters/lever.ts";
import { parseRecruiteeOffers } from "./adapters/recruitee.ts";
import {
  parseSmartRecruitersList,
  parseSmartRecruitersPosting,
} from "./adapters/smartrecruiters.ts";
import { parseAmazonJob } from "./adapters/amazon.ts";
import { parseWorkableAccount } from "./adapters/workable.ts";
import { isIndiaPlace, parseWorkdayPosting } from "./adapters/workday.ts";

async function fixture(name: string): Promise<unknown> {
  const raw = await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
  return JSON.parse(raw) as unknown;
}

test("Greenhouse parser keeps valid jobs and skips a bad row", async () => {
  const jobs = parseGreenhouseBoard(await fixture("greenhouse.json"));
  assert.equal(jobs.length, 2);
  assert.equal(jobs[0]?.title, "Senior Abuse Investigator");
  assert.equal(jobs[0]?.isRemote, true);
  assert.equal(jobs[0]?.seniority, "senior");
  assert.equal(jobs[0]?.descriptionText, "Who we are\nKeep the platform safe.");
  assert.equal(jobs[0]?.source, "greenhouse");
  assert.equal(jobs[1]?.locationNormalized, "New York, NY");
  assert.equal(jobs[1]?.isRemote, false);
});

test("Lever parser reads salary, workplace, and skips an incomplete row", async () => {
  const jobs = parseLeverPostings(await fixture("lever.json"));
  assert.equal(jobs.length, 2);
  assert.equal(jobs[0]?.employmentType, "full_time");
  assert.equal(jobs[0]?.isRemote, false);
  assert.equal(jobs[0]?.salaryMin, 87069);
  assert.equal(jobs[0]?.salaryMax, 124385);
  assert.equal(jobs[1]?.seniority, "intern");
  assert.equal(jobs[1]?.isRemote, true);
  assert.equal(jobs[1]?.employmentType, "internship");
});

test("Ashby parser skips unlisted jobs and keeps compensation", async () => {
  const jobs = parseAshbyBoard(await fixture("ashby.json"));
  assert.equal(jobs.length, 1);
  const job = jobs[0];
  assert.ok(job);
  assert.equal(job.seniority, "staff");
  assert.equal(job.isRemote, true);
  assert.equal(job.employmentType, "full_time");
  assert.equal(job.salaryMin, 180000);
  assert.equal(job.salaryCurrency, "USD");
  assert.equal(job.applyUrl?.endsWith("/application"), true);
});

test("a malformed board fails the company instead of closing every job", () => {
  assert.throws(() => parseGreenhouseBoard({ ok: false }), /Unexpected Greenhouse response/);
  assert.throws(() => parseLeverPostings({ jobs: [] }), /Unexpected Lever response/);
  assert.throws(() => parseAshbyBoard([]), /Unexpected Ashby response/);
  assert.throws(() => parseSmartRecruitersList({ jobs: [] }), /Unexpected SmartRecruiters response/);
  assert.throws(() => parseWorkableAccount({ name: "Apna" }), /Unexpected Workable response/);
  assert.throws(() => parseRecruiteeOffers([]), /Unexpected Recruitee response/);
});

test("SmartRecruiters keeps the posting text and the India location", async () => {
  const list = parseSmartRecruitersList(await fixture("smartrecruiters-list.json"));
  assert.equal(list.totalFound, 2);
  assert.deepEqual(list.ids, ["744000157801788", "99"]);
  const job = parseSmartRecruitersPosting(await fixture("smartrecruiters-posting.json"));
  assert.ok(job);
  assert.equal(job.title, "Senior Software Developer - Backend");
  assert.equal(job.locationNormalized, "Gurugram, India");
  assert.equal(job.isRemote, false);
  assert.equal(job.employmentType, "full_time");
  assert.equal(job.seniority, "senior");
  assert.equal(job.source, "smartrecruiters");
  assert.match(job.descriptionText ?? "", /Build the booking platform/);
});

test("Workable reads a widget job and skips a row without a title", async () => {
  const jobs = parseWorkableAccount(await fixture("workable.json"));
  assert.equal(jobs.length, 2);
  assert.equal(jobs[0]?.externalId, "E47E4A2E42");
  assert.equal(jobs[0]?.locationNormalized, "Bengaluru, India · Mumbai, India");
  assert.equal(jobs[1]?.locationNormalized, "Noida, Uttar Pradesh, India");
  assert.equal(jobs[0]?.source, "workable");
  assert.equal(jobs[0]?.descriptionText, "Build the jobs marketplace.");
});

test("Workday keeps an India posting and drops a different country", async () => {
  const job = parseWorkdayPosting(await fixture("workday.json"));
  assert.ok(job);
  assert.equal(job.externalId, "R160198");
  assert.equal(job.locationNormalized, "Bangalore, India");
  assert.equal(job.employmentType, "full_time");
  assert.equal(job.source, "workday");
  assert.equal(job.descriptionText, "Build the experience platform.");
  assert.equal(
    parseWorkdayPosting({
      jobPostingInfo: {
        title: "Account Executive",
        location: "London",
        country: { descriptor: "United Kingdom" },
        jobReqId: "R1",
      },
    }),
    null,
  );
  assert.equal(isIndiaPlace("Indianapolis, IN"), false);
  assert.equal(isIndiaPlace("Noida"), true);
});

test("Amazon keeps an India engineering role and drops other countries and categories", () => {
  const kept = parseAmazonJob({
    id_icims: "10593786",
    title: "Sr. Product Manager-Technical, Amazon Business",
    description: "<p>Own the roadmap.</p>",
    normalized_location: "Hyderabad, Telangana, IND",
    country_code: "IND",
    job_category: "Software Development",
    job_path: "/en/jobs/10593786/sr-product-manager-technical-amazon-business",
    posted_date: "October 30, 2026",
    job_schedule_type: "Full-Time",
  });
  assert.ok(kept);
  assert.equal(kept.externalId, "10593786");
  assert.equal(kept.locationNormalized, "Hyderabad, Telangana, IND");
  assert.equal(kept.source, "amazon");
  assert.equal(kept.descriptionText, "Own the roadmap.");
  assert.equal(kept.applyUrl, "https://www.amazon.jobs/en/jobs/10593786/sr-product-manager-technical-amazon-business");
  assert.equal(
    parseAmazonJob({
      id_icims: "1",
      title: "Warehouse Associate",
      country_code: "IND",
      job_category: "Fulfillment & Operations Management",
      normalized_location: "Hyderabad, Telangana, IND",
    }),
    null,
  );
  assert.equal(
    parseAmazonJob({
      id_icims: "2",
      title: "Software Development Engineer",
      country_code: "USA",
      job_category: "Software Development",
      normalized_location: "Seattle, WA, USA",
    }),
    null,
  );
});

test("Recruitee keeps requirements and a remote flag", async () => {
  const jobs = parseRecruiteeOffers(await fixture("recruitee.json"));
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.isRemote, true);
  assert.equal(jobs[0]?.employmentType, "full_time");
  assert.equal(jobs[0]?.source, "recruitee");
  assert.match(jobs[0]?.descriptionText ?? "", /built a product before/);
});
