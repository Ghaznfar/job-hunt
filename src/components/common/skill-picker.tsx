"use client";

import { useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface SkillOption {
  slug: string;
  name: string;
  category?: string | null;
}

export function SkillPicker({
  options,
  selectedSlugs,
  onSelectedChange,
  customSkills,
  onCustomChange,
}: {
  options: SkillOption[];
  selectedSlugs: string[];
  onSelectedChange: (next: string[]) => void;
  customSkills: string[];
  onCustomChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = new Set(selectedSlugs);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = options.filter(
      (o) => !q || o.name.toLowerCase().includes(q) || o.slug.includes(q),
    );
    const map = new Map<string, SkillOption[]>();
    for (const o of filtered) {
      const key = o.category || "other";
      (map.get(key) ?? map.set(key, []).get(key)!).push(o);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [options, query]);

  const exactExists = options.some((o) => o.name.toLowerCase() === query.trim().toLowerCase());
  const canAddCustom =
    query.trim().length >= 2 &&
    !exactExists &&
    !customSkills.some((c) => c.toLowerCase() === query.trim().toLowerCase());

  function toggle(slug: string) {
    if (selected.has(slug)) onSelectedChange(selectedSlugs.filter((s) => s !== slug));
    else onSelectedChange([...selectedSlugs, slug]);
  }

  function addCustom() {
    onCustomChange([...customSkills, query.trim()]);
    setQuery("");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Search skills (e.g. Kubernetes, Terraform)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canAddCustom) {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        {canAddCustom ? (
          <button
            type="button"
            onClick={addCustom}
            className="hover:bg-accent inline-flex items-center gap-1 rounded-md border px-3 text-sm whitespace-nowrap"
          >
            <Plus className="size-3.5" /> Add &ldquo;{query.trim()}&rdquo;
          </button>
        ) : null}
      </div>

      {(selectedSlugs.length > 0 || customSkills.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {selectedSlugs.map((slug) => {
            const o = options.find((x) => x.slug === slug);
            return (
              <Badge key={slug} className="gap-1">
                {o?.name ?? slug}
                <button type="button" onClick={() => toggle(slug)} aria-label="Remove">
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
          {customSkills.map((c) => (
            <Badge key={c} variant="secondary" className="gap-1">
              {c}
              <button
                type="button"
                onClick={() => onCustomChange(customSkills.filter((x) => x !== c))}
                aria-label="Remove"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-3">
        {grouped.map(([category, items]) => (
          <div key={category}>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
              {category}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((o) => (
                <button
                  key={o.slug}
                  type="button"
                  onClick={() => toggle(o.slug)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    selected.has(o.slug)
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-accent",
                  )}
                >
                  {selected.has(o.slug) ? <Check className="size-3" /> : null}
                  {o.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No matching skills. Use &ldquo;Add&rdquo; above.
          </p>
        ) : null}
      </div>
    </div>
  );
}
