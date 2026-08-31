"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SkillPicker, type SkillOption } from "@/components/common/skill-picker";
import {
  PersonalFields,
  CareerFields,
  EligibilityFields,
  type ProfileFormState,
} from "@/features/profile/components/profile-fields";
import { completeOnboardingAction } from "@/features/profile/actions";

const STEPS = ["Personal", "Career", "Eligibility", "Skills"] as const;

export function OnboardingWizard({
  initial,
  skillOptions,
}: {
  initial: Partial<ProfileFormState>;
  skillOptions: SkillOption[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<ProfileFormState>({
    name: initial.name ?? "",
    country: initial.country ?? "",
    city: initial.city ?? "",
    linkedinUrl: initial.linkedinUrl ?? "",
    githubUrl: initial.githubUrl ?? "",
    portfolioUrl: initial.portfolioUrl ?? "",
    currentTitle: initial.currentTitle ?? "",
    yearsExperience: initial.yearsExperience ?? "",
    desiredTitles: initial.desiredTitles ?? [],
    targetCountries: initial.targetCountries ?? ["US", "GB"],
    workPreference: initial.workPreference ?? "REMOTE",
    salaryExpectation: initial.salaryExpectation ?? "",
    salaryCurrency: initial.salaryCurrency ?? "USD",
    needsSponsorship: initial.needsSponsorship ?? false,
    workAuthUS: initial.workAuthUS ?? "",
    workAuthGB: initial.workAuthGB ?? "",
  });
  const [skillSlugs, setSkillSlugs] = useState<string[]>([]);
  const [customSkills, setCustomSkills] = useState<string[]>([]);

  const patch = (p: Partial<ProfileFormState>) => setState((s) => ({ ...s, ...p }));

  function validateStep(): string | null {
    if (step === 0) {
      if (!state.name.trim()) return "Enter your name.";
      if (!state.country) return "Select your country.";
    }
    if (step === 1) {
      if (state.desiredTitles.length === 0) return "Add at least one target role.";
      if (state.targetCountries.length === 0) return "Select at least one target country.";
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function submit() {
    setError(null);
    const profileInput = {
      ...state,
      yearsExperience: state.yearsExperience === "" ? undefined : Number(state.yearsExperience),
      salaryExpectation:
        state.salaryExpectation === "" ? undefined : Number(state.salaryExpectation),
      workPreference: state.workPreference || undefined,
      workAuthUS: state.workAuthUS || undefined,
      workAuthGB: state.workAuthGB || undefined,
    };
    start(async () => {
      const res = await completeOnboardingAction(profileInput, { skillSlugs, customSkills });
      if (res.ok) {
        toast.success("You're all set");
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </span>
          <span className="text-muted-foreground">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          {step === 0 ? <PersonalFields state={state} patch={patch} /> : null}
          {step === 1 ? <CareerFields state={state} patch={patch} /> : null}
          {step === 2 ? <EligibilityFields state={state} patch={patch} /> : null}
          {step === 3 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Pick the skills and technologies you actually have experience with. This drives your
                match scores — only add what&apos;s real.
              </p>
              <SkillPicker
                options={skillOptions}
                selectedSlugs={skillSlugs}
                onSelectedChange={setSkillSlugs}
                customSkills={customSkills}
                onCustomChange={setCustomSkills}
              />
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || pending}
            >
              <ArrowLeft className="size-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={next}>
                Continue <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="button" onClick={submit} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Finish
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        You can change any of this later in Profile. Optional fields can be left blank.
      </p>
    </div>
  );
}
