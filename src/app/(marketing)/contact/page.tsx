import type { Metadata } from "next";
import { ContactForm } from "@/features/marketing/contact-form";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the JobHunt team.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">Contact us</h1>
      <p className="mt-4 text-muted-foreground">
        Questions, feedback or bug reports — send them over. You can also email{" "}
        <a href={`mailto:${brand.supportEmail}`} className="underline hover:text-foreground">
          {brand.supportEmail}
        </a>
        .
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>
    </div>
  );
}
