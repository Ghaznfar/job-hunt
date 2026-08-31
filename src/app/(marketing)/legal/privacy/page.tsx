import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How JobHunt collects, uses, stores and protects your personal data, including your CV.",
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>
        Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long" })}
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> name, email, hashed password, and OAuth identifiers if you
          sign in with Google.
        </li>
        <li>
          <strong>Profile data:</strong> location, target roles, salary expectations, remote
          preference, work authorization status and sponsorship needs.
        </li>
        <li>
          <strong>CV data:</strong> the files you upload and the structured content extracted from
          them (experience, education, skills, projects).
        </li>
        <li>
          <strong>Usage data:</strong> jobs you save, matches you run, applications you track, and
          AI requests you make (for metering and abuse prevention).
        </li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>
          To operate the core product: matching, the Should I Apply verdict, CV tailoring, cover
          letters and interview prep.
        </li>
        <li>To enforce plan limits and prevent abuse.</li>
        <li>
          To communicate with you about your account (verification, password resets, service
          notices).
        </li>
      </ul>

      <h2>3. AI processing</h2>
      <p>
        Depending on configuration, portions of your profile, CV content and job descriptions may be
        sent to a third-party AI provider (e.g. Anthropic or OpenAI) to generate analysis and text.
        Only the data needed for the specific feature is sent. We do not use your data to train
        third-party models, and prompts instruct the provider not to retain content beyond the
        request where such controls are available.
      </p>

      <h2>4. Storage &amp; security</h2>
      <ul>
        <li>
          Uploaded CV files are stored in private storage and are only served through short-lived
          signed links.
        </li>
        <li>We do not log the contents of your CV or full personal-information payloads.</li>
        <li>Passwords are hashed with bcrypt. Sessions use signed, http-only cookies.</li>
        <li>
          Access to your data is restricted to your account; every request is authorization-checked.
        </li>
      </ul>

      <h2>5. Retention</h2>
      <p>
        We keep your data for as long as your account is active. When you delete your account, your
        personal data, CV files, applications and AI results are erased immediately.
      </p>

      <h2>6. Your rights</h2>
      <p>
        You can access, correct, export (Settings → Danger zone → Export) and delete your data at
        any time. If you are in the UK/EU you have rights under UK GDPR / GDPR; if you are in
        California you have rights under the CCPA/CPRA. Contact us to exercise any right not
        self-service in the product.
      </p>

      <h2>7. Cookies</h2>
      <p>
        We use strictly necessary cookies for authentication and security. See our{" "}
        <a href="/legal/cookies">Cookie Policy</a>.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about privacy: <a href="/contact">contact us</a>.
      </p>
    </>
  );
}
