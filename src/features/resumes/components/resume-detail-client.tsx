"use client";

import { useState } from "react";
import { VersionSwitcher } from "./version-switcher";
import { ResumeEditor } from "./resume-editor";
import type { EditableResume } from "@/features/resumes/schema";

interface VersionData {
  id: string;
  label: string;
  source: string;
  isCurrent: boolean;
  createdAt: string;
  structured: EditableResume;
}

export function ResumeDetailClient({
  resumeId,
  versions,
  skillSuggestions,
}: {
  resumeId: string;
  versions: VersionData[];
  skillSuggestions: string[];
}) {
  const initialId = versions.find((v) => v.isCurrent)?.id ?? versions[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(initialId);
  const selected = versions.find((v) => v.id === selectedId) ?? versions[0];

  if (!selected) return null;

  return (
    <div className="space-y-6">
      <VersionSwitcher
        resumeId={resumeId}
        versions={versions}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <ResumeEditor
        key={selected.id}
        versionId={selected.id}
        initial={selected.structured}
        skillSuggestions={skillSuggestions}
      />
    </div>
  );
}
