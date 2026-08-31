import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about JobHunt — job sources, AI honesty, privacy, pricing and supported roles.",
  alternates: { canonical: "/faq" },
};

const faqs = [
  {
    q: "Where do the jobs come from?",
    a: "A modular job-provider architecture. It ships with a fully functional demo dataset and integrates the Adzuna API (US & UK) when credentials are configured. We do not scrape sites in violation of their terms of service.",
  },
  {
    q: "Does the AI make things up?",
    a: "No. Every AI feature is constrained to facts already present in your profile or CV, or in the job description. CV tailoring is presented as a diff — original, improved, reason — and you approve each change. A post-generation check rejects any skill or claim not backed by your data.",
  },
  {
    q: "How is the match score calculated?",
    a: "A deterministic rules engine scores six dimensions (technical, experience, location, salary, seniority, eligibility). AI adds an interpretation layer for the written recommendation but cannot change the Apply / Maybe / Don't Apply verdict.",
  },
  {
    q: "Is my CV private?",
    a: "Yes. Uploaded files are stored privately and only ever served through short-lived signed links. We do not expose them publicly and do not log their contents.",
  },
  {
    q: "Can I delete my data?",
    a: "Yes — Settings → Danger zone lets you export all your data as JSON and permanently delete your account and everything associated with it.",
  },
  {
    q: "Which roles and countries are supported?",
    a: "The MVP targets software, DevOps, cloud, SRE, data, security and QA engineers in the United States and United Kingdom.",
  },
  {
    q: "What does it cost?",
    a: "Free covers the core workflow with monthly limits. Pro is $9.99/month for CV tailoring, cover letters, interview prep, skill-gap analysis and higher AI limits.",
  },
  {
    q: "Is this legal/immigration advice?",
    a: "No. Eligibility flags are informational heuristics based on the data you provide and the job description. Always verify requirements with the employer.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">FAQ</h1>
      <div className="mt-10 divide-y">
        {faqs.map((f) => (
          <div key={f.q} className="py-5">
            <h2 className="font-semibold">{f.q}</h2>
            <p className="text-muted-foreground mt-2 text-sm">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
