import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of JobHunt.",
  alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p>Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long" })}</p>

      <h2>1. The service</h2>
      <p>
        JobHunt provides tools to evaluate job postings, tailor CVs, generate cover letters, prepare
        for interviews and track applications. It is decision-support software — it does not
        guarantee interviews, offers, or employment outcomes.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must provide accurate information and keep your credentials secure.</li>
        <li>You must be at least 16 years old (or the age of digital consent in your country).</li>
        <li>One person per account; do not share accounts.</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <ul>
        <li>Do not upload content you do not have the right to use.</li>
        <li>Do not use the service to misrepresent your qualifications to employers.</li>
        <li>Do not attempt to scrape, overload, reverse-engineer or circumvent limits of the service.</li>
        <li>Do not use the service for unlawful, discriminatory or abusive purposes.</li>
      </ul>

      <h2>4. AI-generated content</h2>
      <p>
        AI features assist with drafting and analysis based on the information you provide. You are
        responsible for reviewing all output before using it. Do not submit AI-generated claims that
        are untrue. Eligibility indicators (work authorization, sponsorship, etc.) are heuristics and
        not immigration or legal advice.
      </p>

      <h2>5. Plans &amp; billing</h2>
      <p>
        Free and Pro plans are described on the <a href="/pricing">pricing page</a>. Paid
        subscriptions are billed in advance via Stripe and renew automatically until cancelled. You
        can cancel at any time and retain access until the end of the paid period. Fees are
        non-refundable except where required by law.
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        You retain ownership of your content. You grant us a limited licence to process it solely to
        provide the service. The software, design and brand are owned by JobHunt.
      </p>

      <h2>7. Disclaimers &amp; liability</h2>
      <p>
        The service is provided &ldquo;as is&rdquo; without warranties. To the maximum extent
        permitted by law, JobHunt is not liable for indirect or consequential losses, or for
        outcomes of job applications. Nothing limits liability that cannot be limited by law.
      </p>

      <h2>8. Termination</h2>
      <p>
        You may stop using the service and delete your account at any time. We may suspend or
        terminate accounts that violate these terms.
      </p>

      <h2>9. Changes</h2>
      <p>We may update these terms; material changes will be notified in-product or by email.</p>

      <h2>10. Contact</h2>
      <p>
        <a href="/contact">Contact us</a> with any questions.
      </p>
    </>
  );
}
