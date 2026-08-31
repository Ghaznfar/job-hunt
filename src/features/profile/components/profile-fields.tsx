"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/common/tag-input";
import {
  COUNTRIES,
  CURRENCIES,
  COMMON_TITLES,
  WORK_PREFERENCES,
  WORK_AUTH_STATUSES,
} from "@/features/profile/constants";

export interface ProfileFormState {
  name: string;
  country: string;
  city: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  currentTitle: string;
  yearsExperience: string;
  desiredTitles: string[];
  targetCountries: string[];
  workPreference: string;
  salaryExpectation: string;
  salaryCurrency: string;
  needsSponsorship: boolean;
  workAuthUS: string;
  workAuthGB: string;
}

type Patch = (p: Partial<ProfileFormState>) => void;

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function PersonalFields({ state, patch }: { state: ProfileFormState; patch: Patch }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name">
        <Input value={state.name} onChange={(e) => patch({ name: e.target.value })} />
      </Field>
      <Field label="Country of residence">
        <Select value={state.country} onValueChange={(v) => patch({ country: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="City (optional)">
        <Input value={state.city} onChange={(e) => patch({ city: e.target.value })} />
      </Field>
      <Field label="LinkedIn URL (optional)">
        <Input
          placeholder="https://linkedin.com/in/…"
          value={state.linkedinUrl}
          onChange={(e) => patch({ linkedinUrl: e.target.value })}
        />
      </Field>
      <Field label="GitHub URL (optional)">
        <Input
          placeholder="https://github.com/…"
          value={state.githubUrl}
          onChange={(e) => patch({ githubUrl: e.target.value })}
        />
      </Field>
      <Field label="Portfolio URL (optional)">
        <Input
          placeholder="https://…"
          value={state.portfolioUrl}
          onChange={(e) => patch({ portfolioUrl: e.target.value })}
        />
      </Field>
    </div>
  );
}

export function CareerFields({ state, patch }: { state: ProfileFormState; patch: Patch }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current job title (optional)">
          <Input
            list="common-titles"
            value={state.currentTitle}
            onChange={(e) => patch({ currentTitle: e.target.value })}
          />
          <datalist id="common-titles">
            {COMMON_TITLES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
        <Field label="Years of experience">
          <Input
            type="number"
            min={0}
            max={50}
            step={0.5}
            value={state.yearsExperience}
            onChange={(e) => patch({ yearsExperience: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Target roles" hint="The job titles you want to be matched against.">
        <TagInput
          value={state.desiredTitles}
          onChange={(v) => patch({ desiredTitles: v })}
          suggestions={[...COMMON_TITLES]}
          placeholder="e.g. DevOps Engineer"
          max={10}
        />
      </Field>

      <Field label="Target countries">
        <div className="flex gap-4">
          {[
            { code: "US", label: "United States" },
            { code: "GB", label: "United Kingdom" },
          ].map((c) => {
            const checked = state.targetCountries.includes(c.code);
            return (
              <label key={c.code} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    patch({
                      targetCountries: e.target.checked
                        ? [...state.targetCountries, c.code]
                        : state.targetCountries.filter((x) => x !== c.code),
                    })
                  }
                />
                {c.label}
              </label>
            );
          })}
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Work preference">
          <Select
            value={state.workPreference}
            onValueChange={(v) => patch({ workPreference: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {WORK_PREFERENCES.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Salary expectation (annual)">
          <Input
            type="number"
            min={0}
            placeholder="e.g. 90000"
            value={state.salaryExpectation}
            onChange={(e) => patch({ salaryExpectation: e.target.value })}
          />
        </Field>
        <Field label="Currency">
          <Select
            value={state.salaryCurrency}
            onValueChange={(v) => patch({ salaryCurrency: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

export function EligibilityFields({ state, patch }: { state: ProfileFormState; patch: Patch }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This is used to flag jobs you can&apos;t realistically get — for example roles that require
        work authorization you don&apos;t have, or that don&apos;t offer visa sponsorship.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Work authorization — United States">
          <Select value={state.workAuthUS} onValueChange={(v) => patch({ workAuthUS: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {WORK_AUTH_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Work authorization — United Kingdom">
          <Select value={state.workAuthGB} onValueChange={(v) => patch({ workAuthGB: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {WORK_AUTH_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <label className="flex items-center justify-between rounded-md border p-3">
        <span className="text-sm">
          I would generally need visa sponsorship for roles outside my home country
        </span>
        <Switch
          checked={state.needsSponsorship}
          onCheckedChange={(v) => patch({ needsSponsorship: v })}
        />
      </label>
    </div>
  );
}
