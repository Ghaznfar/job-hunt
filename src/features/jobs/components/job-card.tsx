import Link from "next/link";
import { Building2, MapPin, Banknote, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSalaryRange, relativeDate } from "@/lib/utils";
import { ARRANGEMENT_LABEL, experienceLabel } from "@/features/jobs/format";
import { SaveButton } from "./save-button";
import { VerdictBadge } from "./verdict-badge";

export interface JobCardData {
  id: string;
  title: string;
  company: string;
  location: string | null;
  country: string;
  workArrangement: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  seniorityLevel: string | null;
  minYearsRequired: number | null;
  maxYearsRequired: number | null;
  postedAt: string | null;
  isSaved: boolean;
  jobSkills: { skill: { name: string } }[];
  verdict?: "APPLY" | "MAYBE" | "DONT_APPLY" | null;
  matchScore?: number | null;
}

export function JobCard({ job }: { job: JobCardData }) {
  const salary = formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const exp = experienceLabel(job.minYearsRequired, job.maxYearsRequired);
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/dashboard/jobs/${job.id}`} className="block">
              <h3 className="truncate font-semibold hover:underline">{job.title}</h3>
            </Link>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="size-3.5" />
              {job.company}
            </p>
          </div>
          <SaveButton jobId={job.id} initialSaved={job.isSaved} size="icon" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            {job.location || job.country} · {ARRANGEMENT_LABEL[job.workArrangement]}
          </span>
          {salary ? (
            <span className="flex items-center gap-1">
              <Banknote className="size-3.5" />
              {salary}
            </span>
          ) : null}
          {exp ? <span>{exp}</span> : null}
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {relativeDate(job.postedAt)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.jobSkills.slice(0, 6).map((s) => (
            <Badge key={s.skill.name} variant="outline" className="text-xs font-normal">
              {s.skill.name}
            </Badge>
          ))}
          {job.jobSkills.length > 6 ? (
            <span className="text-xs text-muted-foreground">+{job.jobSkills.length - 6}</span>
          ) : null}
        </div>

        {job.verdict ? (
          <div className="mt-3">
            <VerdictBadge verdict={job.verdict} score={job.matchScore} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
