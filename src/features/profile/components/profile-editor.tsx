"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkillPicker, type SkillOption } from "@/components/common/skill-picker";
import {
  PersonalFields,
  CareerFields,
  EligibilityFields,
  type ProfileFormState,
} from "@/features/profile/components/profile-fields";
import { saveProfileAction, saveSkillsAction } from "@/features/profile/actions";

export function ProfileEditor({
  initial,
  skillOptions,
  initialSelectedSlugs,
  initialCustomSkills,
}: {
  initial: ProfileFormState;
  skillOptions: SkillOption[];
  initialSelectedSlugs: string[];
  initialCustomSkills: string[];
}) {
  const router = useRouter();
  const [state, setState] = useState<ProfileFormState>(initial);
  const [savingProfile, startProfile] = useTransition();
  const [savingSkills, startSkills] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [skillSlugs, setSkillSlugs] = useState<string[]>(initialSelectedSlugs);
  const [customSkills, setCustomSkills] = useState<string[]>(initialCustomSkills);

  const patch = (p: Partial<ProfileFormState>) => setState((s) => ({ ...s, ...p }));

  function saveProfile() {
    setError(null);
    const input = {
      ...state,
      yearsExperience: state.yearsExperience === "" ? undefined : Number(state.yearsExperience),
      salaryExpectation:
        state.salaryExpectation === "" ? undefined : Number(state.salaryExpectation),
      workPreference: state.workPreference || undefined,
      workAuthUS: state.workAuthUS || undefined,
      workAuthGB: state.workAuthGB || undefined,
    };
    startProfile(async () => {
      const res = await saveProfileAction(input);
      if (res.ok) {
        toast.success("Profile saved");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function saveSkills() {
    startSkills(async () => {
      const res = await saveSkillsAction({ skillSlugs, customSkills });
      if (res.ok) {
        toast.success("Skills saved");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal</CardTitle>
        </CardHeader>
        <CardContent>
          <PersonalFields state={state} patch={patch} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Career</CardTitle>
        </CardHeader>
        <CardContent>
          <CareerFields state={state} patch={patch} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work eligibility</CardTitle>
        </CardHeader>
        <CardContent>
          <EligibilityFields state={state} patch={patch} />
        </CardContent>
      </Card>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex justify-end">
        <Button onClick={saveProfile} disabled={savingProfile}>
          {savingProfile ? <Loader2 className="size-4 animate-spin" /> : null}
          Save profile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Skills &amp; technologies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Only include skills you genuinely have. These drive your match scores and skill-gap
            analysis.
          </p>
          <SkillPicker
            options={skillOptions}
            selectedSlugs={skillSlugs}
            onSelectedChange={setSkillSlugs}
            customSkills={customSkills}
            onCustomChange={setCustomSkills}
          />
          <div className="flex justify-end">
            <Button onClick={saveSkills} disabled={savingSkills} variant="secondary">
              {savingSkills ? <Loader2 className="size-4 animate-spin" /> : null}
              Save skills
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
