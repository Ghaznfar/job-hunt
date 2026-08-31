import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why JobHunt exists: helping tech professionals stop applying blindly and focus on the jobs they can actually get.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">About JobHunt</h1>
      <div className="prose prose-sm text-muted-foreground [&_h2]:text-foreground mt-8 max-w-none [&_h2]:mt-8 [&_p]:mt-3">
        <p>
          Job hunting as an engineer has become a numbers game: fire off a hundred applications and
          hope. It&apos;s exhausting, it&apos;s demoralising, and it produces low-quality
          applications that don&apos;t get responses.
        </p>
        <h2>The idea</h2>
        <p>
          JobHunt flips the model. Instead of helping you apply to more jobs faster, it helps you
          decide which jobs are worth applying to at all — using your real skills, experience,
          salary expectations and, critically, your work eligibility. Then it helps you make each of
          those applications genuinely strong.
        </p>
        <h2>Principles</h2>
        <p>
          <strong>Deterministic where it counts.</strong> The match score and the Apply / Maybe /
          Don&apos;t Apply verdict come from testable rules, not a language model&apos;s mood.
        </p>
        <p>
          <strong>Never fabricate.</strong> AI features only ever use facts you&apos;ve provided.
          They will not add skills, employers or achievements you don&apos;t have.
        </p>
        <p>
          <strong>Your data is yours.</strong> CVs are stored privately, never logged, and you can
          export or delete everything at any time.
        </p>
        <h2>Where we are</h2>
        <p>
          This is an early MVP focused on software, DevOps, cloud, SRE, data, security and QA
          engineers in the US and UK. Feedback is very welcome.
        </p>
      </div>
    </div>
  );
}
