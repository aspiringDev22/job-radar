import { locationInIndia } from "./locations.ts";

export type JobPostingInput = {
  title: string;
  descriptionText: string | null;
  postedAt: Date | null;
  firstSeenAt: Date;
  location: string | null;
  locations?: { label: string }[];
  isRemote: boolean;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  applyUrl: string | null;
  companyName: string;
  companyWebsite: string | null;
  externalId: string;
  pageUrl: string;
  closedAt?: Date | null;
};

const EMPLOYMENT: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
  temporary: "TEMPORARY",
};

export function jobPostingJsonLd(job: JobPostingInput): Record<string, unknown> {
  const inIndia = locationInIndia(job.location);
  const organization: Record<string, unknown> = {
    "@type": "Organization",
    name: job.companyName,
  };
  if (job.companyWebsite) {
    organization.sameAs = job.companyWebsite;
  }

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.descriptionText?.trim() || job.title,
    datePosted: (job.postedAt ?? job.firstSeenAt).toISOString(),
    hiringOrganization: organization,
    identifier: {
      "@type": "PropertyValue",
      name: job.companyName,
      value: job.externalId,
    },
    url: job.pageUrl,
    directApply: Boolean(job.applyUrl) && !job.closedAt,
  };

  if (job.closedAt) {
    data.validThrough = job.closedAt.toISOString();
  }

  if (job.isRemote) {
    data.jobLocationType = "TELECOMMUTE";
    data.applicantLocationRequirements = {
      "@type": "Country",
      name: inIndia || !job.location ? "India" : job.location,
    };
  }

  if (job.locations && job.locations.length > 1) {
    data.jobLocation = job.locations.map((location) => ({
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: location.label,
        ...(locationInIndia(location.label) ? { addressCountry: "IN" } : {}),
      },
    }));
  } else if (job.location || inIndia) {
    data.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(job.location ? { addressLocality: job.location } : {}),
        ...(inIndia ? { addressCountry: "IN" } : {}),
      },
    };
  }

  const employmentType = job.employmentType ? EMPLOYMENT[job.employmentType] : undefined;
  if (employmentType) {
    data.employmentType = employmentType;
  }

  if (
    job.salaryMin != null &&
    job.salaryMax != null &&
    job.salaryCurrency &&
    job.salaryMin <= job.salaryMax
  ) {
    data.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salaryCurrency,
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salaryMin,
        maxValue: job.salaryMax,
        unitText: "YEAR",
      },
    };
  }

  return data;
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}
