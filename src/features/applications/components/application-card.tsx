"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Building2, CalendarClock, StickyNote, GripVertical } from "lucide-react";
import { cn, relativeDate } from "@/lib/utils";

export interface BoardCard {
  id: string;
  company: string;
  title: string;
  salary: string | null;
  nextInterviewAt: string | null;
  noteCount: number;
  jobId: string | null;
}

export function ApplicationCard({
  card,
  onOpen,
  overlay,
}: {
  card: BoardCard;
  onOpen?: (id: string) => void;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: overlay,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "group rounded-lg border bg-card p-3 text-sm shadow-sm",
        isDragging && "opacity-40",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen?.(card.id)}
          type="button"
        >
          <p className="truncate font-medium">{card.title}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Building2 className="size-3" />
            {card.company}
          </p>
        </button>
        <button
          className="cursor-grab touch-none text-muted-foreground opacity-0 group-hover:opacity-100"
          {...attributes}
          {...listeners}
          aria-label="Drag"
          type="button"
        >
          <GripVertical className="size-4" />
        </button>
      </div>
      {(card.salary || card.nextInterviewAt || card.noteCount > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {card.salary ? <span>{card.salary}</span> : null}
          {card.nextInterviewAt ? (
            <span className="flex items-center gap-1">
              <CalendarClock className="size-3" />
              {relativeDate(card.nextInterviewAt)}
            </span>
          ) : null}
          {card.noteCount > 0 ? (
            <span className="flex items-center gap-1">
              <StickyNote className="size-3" />
              {card.noteCount}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
