import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "The cookies JobHunt uses and why.",
  alternates: { canonical: "/legal/cookies" },
};

export default function CookiesPage() {
  return (
    <>
      <h1>Cookie Policy</h1>
      <p>
        Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long" })}
      </p>

      <h2>Strictly necessary cookies</h2>
      <p>These are required for the app to function and cannot be switched off:</p>
      <ul>
        <li>
          <strong>Session cookie</strong> (<code>authjs.session-token</code> / host-prefixed
          variants): keeps you signed in. Http-only, secure, SameSite=Lax.
        </li>
        <li>
          <strong>CSRF token</strong> (<code>authjs.csrf-token</code>): protects authentication
          requests against cross-site forgery.
        </li>
        <li>
          <strong>Callback URL</strong> (<code>authjs.callback-url</code>): returns you to the right
          page after signing in.
        </li>
      </ul>

      <h2>Local storage</h2>
      <p>
        We use your browser&apos;s local storage to remember your theme preference
        (light/dark/system). This never leaves your device.
      </p>

      <h2>What we don&apos;t use</h2>
      <p>
        No advertising cookies, no cross-site tracking, no third-party analytics in the MVP. If that
        changes we will update this policy and ask for consent where required.
      </p>
    </>
  );
}
