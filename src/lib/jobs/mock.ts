import type { JobProvider } from "./provider";
import type { RawJob, ProviderSearchParams } from "./types";

interface Template {
  family: string;
  titles: string[];
  core: string[]; // required skills
  extra: string[]; // preferred skills
  seniority: { label: string; years: string }[];
}

const TEMPLATES: Template[] = [
  {
    family: "DevOps",
    titles: ["DevOps Engineer", "Platform Engineer", "Infrastructure Engineer"],
    core: ["AWS", "Kubernetes", "Terraform", "Docker", "CI/CD", "Linux"],
    extra: ["Helm", "ArgoCD", "Python", "Prometheus", "Grafana"],
    seniority: [
      { label: "", years: "2-4 years" },
      { label: "Senior ", years: "5-8 years" },
      { label: "Lead ", years: "8+ years" },
    ],
  },
  {
    family: "Cloud",
    titles: ["Cloud Engineer", "Cloud Infrastructure Engineer", "AWS Cloud Engineer"],
    core: ["AWS", "Terraform", "Networking", "Linux", "Python"],
    extra: ["Azure", "GCP", "Kubernetes", "CloudFormation"],
    seniority: [
      { label: "", years: "2-3 years" },
      { label: "Senior ", years: "4-7 years" },
    ],
  },
  {
    family: "SRE",
    titles: ["Site Reliability Engineer", "SRE", "Production Engineer"],
    core: ["Kubernetes", "Prometheus", "Grafana", "SRE", "Go", "Incident Management"],
    extra: ["OpenTelemetry", "PagerDuty", "Terraform", "Python"],
    seniority: [
      { label: "", years: "3-5 years" },
      { label: "Senior ", years: "6-9 years" },
    ],
  },
  {
    family: "Software",
    titles: ["Backend Engineer", "Software Engineer", "Full Stack Engineer"],
    core: ["TypeScript", "Node.js", "PostgreSQL", "React", "System Design"],
    extra: ["Next.js", "Redis", "Kafka", "GraphQL", "AWS"],
    seniority: [
      { label: "", years: "1-3 years" },
      { label: "Senior ", years: "5-8 years" },
      { label: "Staff ", years: "9+ years" },
    ],
  },
  {
    family: "Data",
    titles: ["Data Engineer", "Analytics Engineer", "Senior Data Engineer"],
    core: ["Python", "SQL", "Apache Spark", "Apache Airflow", "dbt"],
    extra: ["Snowflake", "Apache Kafka", "AWS", "Scala"],
    seniority: [
      { label: "", years: "2-4 years" },
      { label: "Senior ", years: "5-8 years" },
    ],
  },
  {
    family: "Security",
    titles: ["Security Engineer", "Cloud Security Engineer", "Application Security Engineer"],
    core: ["IAM", "OWASP", "Vulnerability Management", "Linux", "Python"],
    extra: ["SIEM", "Zero Trust", "SOC 2", "Kubernetes", "Penetration Testing"],
    seniority: [
      { label: "", years: "3-5 years" },
      { label: "Senior ", years: "6-10 years" },
    ],
  },
  {
    family: "QA",
    titles: ["QA Engineer", "Test Automation Engineer", "SDET"],
    core: ["Test Automation", "Playwright", "TypeScript", "CI/CD"],
    extra: ["Cypress", "Selenium", "Performance Testing", "Python"],
    seniority: [
      { label: "", years: "2-4 years" },
      { label: "Senior ", years: "5-7 years" },
    ],
  },
];

const COMPANIES = [
  { name: "Northwind Labs", domain: "northwindlabs.com" },
  { name: "Halcyon Systems", domain: "halcyon.io" },
  { name: "Brightwater", domain: "brightwater.co" },
  { name: "Meridian Cloud", domain: "meridiancloud.com" },
  { name: "Cobalt & Finch", domain: "cobaltfinch.com" },
  { name: "Torchlight", domain: "torchlight.dev" },
  { name: "Ravenridge", domain: "ravenridge.com" },
  { name: "Solstice Data", domain: "solsticedata.io" },
  { name: "Ironvale", domain: "ironvale.tech" },
  { name: "Kestrel Software", domain: "kestrelsoftware.com" },
  { name: "Aperture Retail", domain: "apertureretail.com" },
  { name: "Blue Harbor Bank", domain: "blueharborbank.com" },
];

const US_CITIES = [
  "New York, NY",
  "Austin, TX",
  "Seattle, WA",
  "Denver, CO",
  "Remote (US)",
  "Boston, MA",
];
const GB_CITIES = [
  "London, UK",
  "Manchester, UK",
  "Edinburgh, UK",
  "Bristol, UK",
  "Remote (UK)",
  "Leeds, UK",
];

const REMOTE_CLAUSES = [
  "This is a fully remote role open to candidates across the country.",
  "Hybrid: 2 days per week in the office.",
  "On-site position; relocation assistance available.",
  "Remote-first team with optional office access.",
];

const SPONSOR_CLAUSES = [
  "We are able to sponsor visas for exceptional candidates.",
  "Unfortunately we are unable to provide visa sponsorship for this role.",
  "", // unknown
  "",
];

const AUTH_CLAUSES: Record<string, string[]> = {
  US: [
    "You must be authorized to work in the United States.",
    "",
    "US citizenship is required due to client contracts.",
  ],
  GB: ["You must have the right to work in the UK.", "", ""],
};

function pick<T>(arr: T[], n: number): T {
  return arr[n % arr.length];
}

function buildDescription(
  t: Template,
  sen: { label: string; years: string },
  opts: {
    company: string;
    remote: string;
    sponsor: string;
    auth: string;
  },
) {
  return `${opts.company} is hiring a ${sen.label}${t.titles[0]} to join our engineering team.

About the role
${opts.remote} You will work on production systems used by thousands of customers, collaborating closely with product and platform teams.

What you'll do
• Design, build and operate services with ${t.core.slice(0, 3).join(", ")}
• Improve reliability, observability and delivery pipelines
• Participate in code review and an on-call rotation
• Mentor other engineers and drive technical decisions

Requirements
• ${sen.years} of relevant professional experience
• Strong hands-on experience with ${t.core.join(", ")}
• Solid understanding of system design and CI/CD practices
• Good written and verbal communication

Nice to have
• Exposure to ${t.extra.join(", ")}
• Experience in a regulated or high-scale environment

${opts.auth} ${opts.sponsor}`.trim();
}

/**
 * Deterministic synthetic dataset. Same inputs always produce the same jobs so
 * ingestion is idempotent and tests are stable.
 */
export class MockJobProvider implements JobProvider {
  readonly key = "mock";
  isConfigured() {
    return true;
  }

  private all(): RawJob[] {
    const jobs: RawJob[] = [];
    let i = 0;
    for (const t of TEMPLATES) {
      for (let s = 0; s < t.seniority.length; s++) {
        for (let c = 0; c < 4; c++) {
          const country = c % 2 === 0 ? "US" : "GB";
          const company = pick(COMPANIES, i + c);
          const sen = t.seniority[s];
          const title = `${sen.label}${pick(t.titles, i)}`;
          const cities = country === "US" ? US_CITIES : GB_CITIES;
          const remote = pick(REMOTE_CLAUSES, i + s);
          const sponsor = pick(SPONSOR_CLAUSES, i + c + s);
          const auth = pick(AUTH_CLAUSES[country], i + s);
          const baseSalary = country === "US" ? 110_000 : 65_000;
          const bump = s * (country === "US" ? 45_000 : 25_000);
          jobs.push({
            externalId: `mock-${t.family}-${s}-${c}`.toLowerCase(),
            title,
            company: company.name,
            companyDomain: company.domain,
            location: pick(cities, i + c),
            country,
            remoteHint: remote,
            employmentType: "Full-time",
            salaryMin: baseSalary + bump,
            salaryMax: baseSalary + bump + (country === "US" ? 40_000 : 20_000),
            salaryCurrency: country === "US" ? "USD" : "GBP",
            description: buildDescription(t, sen, {
              company: company.name,
              remote,
              sponsor,
              auth,
            }),
            url: `https://example.com/jobs/mock-${t.family}-${s}-${c}`.toLowerCase(),
            postedAt: new Date(Date.now() - ((i * 37) % 30) * 86_400_000).toISOString(),
          });
          i++;
        }
      }
    }
    return jobs;
  }

  async fetch(params: ProviderSearchParams): Promise<RawJob[]> {
    let jobs = this.all();
    if (params.country) jobs = jobs.filter((j) => j.country === params.country);
    if (params.remoteOnly) jobs = jobs.filter((j) => /remote/i.test(j.remoteHint ?? ""));
    if (params.query) {
      const q = params.query.toLowerCase();
      jobs = jobs.filter(
        (j) => j.title.toLowerCase().includes(q) || j.description.toLowerCase().includes(q),
      );
    }
    return params.limit ? jobs.slice(0, params.limit) : jobs;
  }
}
