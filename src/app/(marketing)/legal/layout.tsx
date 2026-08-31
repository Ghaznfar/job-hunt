export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="prose prose-sm max-w-none text-muted-foreground [&_h1]:text-foreground [&_h2]:mt-8 [&_h2]:text-foreground [&_h3]:text-foreground [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
        <hr className="my-10" />
        <p className="text-xs">
          This document is a plain-language template provided for transparency about how the product
          works. It is not legal advice. Consult a qualified professional before relying on it for
          compliance purposes.
        </p>
      </div>
    </div>
  );
}
