"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/common/tag-input";
import type { EditableResume } from "@/features/resumes/schema";
import { saveResumeVersionAction } from "@/features/resumes/actions";

type Exp = EditableResume["experience"][number];
type Edu = EditableResume["education"][number];

export function ResumeEditor({
  versionId,
  initial,
  skillSuggestions,
}: {
  versionId: string;
  initial: EditableResume;
  skillSuggestions: string[];
}) {
  const router = useRouter();
  const [data, setData] = useState<EditableResume>(initial);
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);

  function update(patch: Partial<EditableResume>) {
    setData((d) => ({ ...d, ...patch }));
    setDirty(true);
  }

  function updateExp(i: number, patch: Partial<Exp>) {
    update({ experience: data.experience.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });
  }
  function updateEdu(i: number, patch: Partial<Edu>) {
    update({ education: data.education.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });
  }

  function save() {
    start(async () => {
      const res = await saveResumeVersionAction({ versionId, data });
      if (res.ok) {
        toast.success("CV saved");
        setDirty(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-10 -mx-4 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border sm:px-4">
        <p className="text-sm text-muted-foreground">
          {dirty ? "Unsaved changes" : "All changes saved"}
        </p>
        <Button onClick={save} disabled={pending || !dirty} size="sm">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={data.summary}
            onChange={(e) => update({ summary: e.target.value })}
            placeholder="A short professional summary…"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Experience</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              update({
                experience: [
                  ...data.experience,
                  { company: "", title: "", location: "", startDate: "", endDate: "", current: false, bullets: [], techs: [] },
                ],
              })
            }
          >
            <Plus className="size-4" /> Add role
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.experience.length === 0 ? (
            <p className="text-sm text-muted-foreground">No experience entries yet.</p>
          ) : null}
          {data.experience.map((exp, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <GripVertical className="size-3.5" /> Role {i + 1}
                </div>
                <button
                  className="text-destructive"
                  onClick={() => update({ experience: data.experience.filter((_, idx) => idx !== i) })}
                  aria-label="Remove role"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={exp.title} onChange={(e) => updateExp(i, { title: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Company</Label>
                  <Input value={exp.company} onChange={(e) => updateExp(i, { company: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Start</Label>
                  <Input
                    value={exp.startDate}
                    onChange={(e) => updateExp(i, { startDate: e.target.value })}
                    placeholder="Jan 2022"
                  />
                </div>
                <div className="space-y-1">
                  <Label>End</Label>
                  <Input
                    value={exp.endDate}
                    onChange={(e) => updateExp(i, { endDate: e.target.value })}
                    placeholder="Present"
                    disabled={exp.current}
                  />
                </div>
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={exp.current}
                  onChange={(e) => updateExp(i, { current: e.target.checked, endDate: e.target.checked ? "" : exp.endDate })}
                />
                I currently work here
              </label>
              <div className="mt-3 space-y-1">
                <Label>Highlights (one per line)</Label>
                <Textarea
                  rows={4}
                  value={exp.bullets.join("\n")}
                  onChange={(e) => updateExp(i, { bullets: e.target.value.split("\n").filter((x) => x.trim()) })}
                />
              </div>
              <div className="mt-3 space-y-1">
                <Label>Technologies used</Label>
                <TagInput
                  value={exp.techs}
                  onChange={(v) => updateExp(i, { techs: v })}
                  suggestions={skillSuggestions}
                  placeholder="Add a technology"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Education</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              update({
                education: [
                  ...data.education,
                  { institution: "", degree: "", field: "", startDate: "", endDate: "", grade: "" },
                ],
              })
            }
          >
            <Plus className="size-4" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.education.map((edu, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="mb-2 flex justify-end">
                <button
                  className="text-destructive"
                  onClick={() => update({ education: data.education.filter((_, idx) => idx !== i) })}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Institution</Label>
                  <Input
                    value={edu.institution}
                    onChange={(e) => updateEdu(i, { institution: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Degree</Label>
                  <Input value={edu.degree} onChange={(e) => updateEdu(i, { degree: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Field</Label>
                  <Input value={edu.field} onChange={(e) => updateEdu(i, { field: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Year</Label>
                  <Input value={edu.endDate} onChange={(e) => updateEdu(i, { endDate: e.target.value })} />
                </div>
              </div>
            </div>
          ))}
          {data.education.length === 0 ? (
            <p className="text-sm text-muted-foreground">No education entries yet.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <TagInput
            value={data.skills}
            onChange={(v) => update({ skills: v })}
            suggestions={skillSuggestions}
            placeholder="Add a skill"
            max={60}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            These feed job matching. Keep them accurate.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certifications</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            placeholder="One per line, e.g. AWS Solutions Architect – Associate"
            value={data.certifications.map((c) => (c.issuer ? `${c.name} — ${c.issuer}` : c.name)).join("\n")}
            onChange={(e) =>
              update({
                certifications: e.target.value
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean)
                  .map((l) => {
                    const [name, issuer] = l.split(/\s+—\s+|\s+-\s+/);
                    return { name: name.trim(), issuer: (issuer ?? "").trim() };
                  }),
              })
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Languages</CardTitle>
        </CardHeader>
        <CardContent>
          <TagInput
            value={data.languages.map((l) => l.name)}
            onChange={(v) => update({ languages: v.map((name) => ({ name, proficiency: "" })) })}
            placeholder="Add a language"
          />
        </CardContent>
      </Card>
    </div>
  );
}
