"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/common/tag-input";
import { EXPERIENCE_BANDS } from "@/features/jobs/search";

const REMOTE = [
  ["any", "Any location type"],
  ["REMOTE", "Remote"],
  ["HYBRID", "Hybrid"],
  ["ONSITE", "On-site"],
] as const;
const DATES = [
  ["any", "Any time"],
  ["1", "Last 24 hours"],
  ["3", "Last 3 days"],
  ["7", "Last week"],
  ["14", "Last 2 weeks"],
  ["30", "Last month"],
] as const;
const SENIORITY = ["any", "junior", "mid", "senior", "lead", "staff", "principal"] as const;

export function JobFilters({
  skillOptions,
  initial,
}: {
  skillOptions: { slug: string; name: string }[];
  initial: Record<string, string | string[] | undefined>;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  const [q, setQ] = useState(String(initial.q ?? ""));
  const [country, setCountry] = useState(String(initial.country ?? "any"));
  const [remote, setRemote] = useState(String(initial.remote ?? "any"));
  const [experience, setExperience] = useState(String(initial.experience ?? "any"));
  const [datePosted, setDatePosted] = useState(String(initial.datePosted ?? "any"));
  const [seniority, setSeniority] = useState(String(initial.seniority ?? "any"));
  const [salaryMin, setSalaryMin] = useState(String(initial.salaryMin ?? ""));
  const initialSkillNames = (
    Array.isArray(initial.skills)
      ? initial.skills
      : String(initial.skills ?? "")
          .split(",")
          .filter(Boolean)
  ).map((slug) => skillOptions.find((s) => s.slug === slug)?.name ?? slug);
  const [skillNames, setSkillNames] = useState<string[]>(initialSkillNames);

  function apply() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (country !== "any") params.set("country", country);
    if (remote !== "any") params.set("remote", remote);
    if (experience !== "any") params.set("experience", experience);
    if (datePosted !== "any") params.set("datePosted", datePosted);
    if (seniority !== "any") params.set("seniority", seniority);
    if (salaryMin && Number(salaryMin) > 0) params.set("salaryMin", salaryMin);
    const slugs = skillNames
      .map((n) => skillOptions.find((s) => s.name.toLowerCase() === n.toLowerCase())?.slug)
      .filter(Boolean) as string[];
    if (slugs.length) params.set("skills", slugs.join(","));
    start(() => router.push(`/dashboard/jobs?${params.toString()}`));
  }

  function reset() {
    setQ("");
    setCountry("any");
    setRemote("any");
    setExperience("any");
    setDatePosted("any");
    setSeniority("any");
    setSalaryMin("");
    setSkillNames([]);
    start(() => router.push("/dashboard/jobs"));
  }

  const hasFilters = sp.toString().length > 0;

  return (
    <div className="bg-card space-y-4 rounded-xl border p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Job title, company or keyword"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
          />
        </div>
        <Button onClick={apply} disabled={pending}>
          Search
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any country</SelectItem>
              <SelectItem value="US">United States</SelectItem>
              <SelectItem value="GB">United Kingdom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Location type</Label>
          <Select value={remote} onValueChange={setRemote}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REMOTE.map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Experience</Label>
          <Select value={experience} onValueChange={setExperience}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_BANDS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Seniority</Label>
          <Select value={seniority} onValueChange={setSeniority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SENIORITY.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "any" ? "Any level" : s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Posted within</Label>
          <Select value={datePosted} onValueChange={setDatePosted}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATES.map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Min. salary</Label>
          <Input
            type="number"
            min={0}
            step={5000}
            placeholder="Any"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Skills</Label>
        <TagInput
          value={skillNames}
          onChange={setSkillNames}
          suggestions={skillOptions.map((s) => s.name)}
          placeholder="Filter by required skills"
        />
      </div>

      <div className="flex items-center justify-between">
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="size-4" /> Clear filters
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={apply} disabled={pending} size="sm">
          Apply filters
        </Button>
      </div>
    </div>
  );
}
