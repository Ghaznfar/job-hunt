"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter",
  suggestions = [],
  max = 20,
  className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  max?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  function add(tag: string) {
    const t = tag.trim();
    if (!t) return;
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) return;
    if (value.length >= max) return;
    onChange([...value, t]);
    setDraft("");
  }

  function remove(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      remove(value[value.length - 1]!);
    }
  }

  const filteredSuggestions = suggestions
    .filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
    .filter((s) => (draft ? s.toLowerCase().includes(draft.toLowerCase()) : true))
    .slice(0, 6);

  return (
    <div className={className}>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button type="button" onClick={() => remove(tag)} aria-label={`Remove ${tag}`}>
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft && add(draft)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {filteredSuggestions.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              )}
            >
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
