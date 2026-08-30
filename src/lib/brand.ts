export const brand = {
  name: "JobHunt",
  tagline: "Know which jobs are worth applying to.",
  description:
    "AI-powered job matching, CV tailoring, cover letters and interview prep for tech professionals in the US and UK.",
  supportEmail: "support@jobhunt.example",
};

export const marketingNav = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
] as const;

export const footerNav = {
  Product: [
    { href: "/features", label: "Features" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/faq", label: "FAQ" },
  ],
  Company: [
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
  Legal: [
    { href: "/legal/privacy", label: "Privacy Policy" },
    { href: "/legal/terms", label: "Terms of Service" },
    { href: "/legal/cookies", label: "Cookie Policy" },
  ],
} as const;

export const targetRoles = [
  "Software Engineers",
  "DevOps Engineers",
  "Cloud Engineers",
  "SRE Engineers",
  "Data Engineers",
  "Cybersecurity Engineers",
  "QA Engineers",
] as const;
