import Link from "next/link";
import { Logo } from "@/components/common/logo";
import { brand, footerNav } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="bg-muted/30 border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="text-muted-foreground max-w-xs text-sm">{brand.description}</p>
        </div>
        {Object.entries(footerNav).map(([group, links]) => (
          <div key={group} className="space-y-3">
            <h3 className="text-sm font-semibold">{group}</h3>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </p>
          <p>Built for tech professionals in the US &amp; UK.</p>
        </div>
      </div>
    </footer>
  );
}
