"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { setCurrentVersionAction } from "@/features/resumes/actions";

interface VersionOpt {
  id: string;
  label: string;
  source: string;
  isCurrent: boolean;
  createdAt: string;
}

export function VersionSwitcher({
  resumeId,
  versions,
  selectedId,
  onSelect,
}: {
  resumeId: string;
  versions: VersionOpt[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const selected = versions.find((v) => v.id === selectedId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={selectedId} onValueChange={onSelect}>
        <SelectTrigger className="w-[260px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {versions.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.label} {v.isCurrent ? "· current" : ""} ({v.source.toLowerCase()})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected && !selected.isCurrent ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await setCurrentVersionAction(resumeId, selected.id);
              if (res.ok) {
                toast.success("Set as current version");
                router.refresh();
              } else toast.error(res.error);
            })
          }
        >
          <Check className="size-4" /> Use for matching
        </Button>
      ) : null}
    </div>
  );
}
