"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { STATUS_ORDER, STATUS_LABEL, STATUS_ACCENT } from "@/features/applications/constants";
import { ApplicationCard, type BoardCard } from "./application-card";
import { ApplicationDetailDialog } from "./application-detail-dialog";
import {
  moveApplicationAction,
  reorderApplicationsAction,
} from "@/features/applications/actions";
import type { ApplicationStatus } from "@prisma/client";

type BoardState = Record<ApplicationStatus, BoardCard[]>;

function emptyBoard(): BoardState {
  const b = {} as BoardState;
  for (const s of STATUS_ORDER) b[s] = [];
  return b;
}

function Column({
  status,
  cards,
  onOpen,
}: {
  status: ApplicationStatus;
  cards: BoardCard[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={cn("size-2 rounded-full", STATUS_ACCENT[status])} />
        <span className="text-sm font-medium">{STATUS_LABEL[status]}</span>
        <span className="text-xs text-muted-foreground">{cards.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors",
          isOver && "border-primary bg-primary/5",
        )}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <ApplicationCard key={card.id} card={card} onOpen={onOpen} />
          ))}
        </SortableContext>
        {cards.length === 0 ? (
          <p className="px-1 py-3 text-center text-xs text-muted-foreground">Drop here</p>
        ) : null}
      </div>
    </div>
  );
}

export function KanbanBoard({ initial }: { initial: BoardState }) {
  const router = useRouter();
  const [board, setBoard] = useState<BoardState>({ ...emptyBoard(), ...initial });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const locate = useMemo(() => {
    const m = new Map<string, ApplicationStatus>();
    (Object.keys(board) as ApplicationStatus[]).forEach((s) =>
      board[s].forEach((c) => m.set(c.id, s)),
    );
    return m;
  }, [board]);

  const activeCard = activeId
    ? board[locate.get(activeId) ?? "SAVED"]?.find((c) => c.id === activeId) ?? null
    : null;

  function columnOf(overId: string): ApplicationStatus | null {
    if (overId.startsWith("col:")) return overId.slice(4) as ApplicationStatus;
    return locate.get(overId) ?? null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    setActiveId(null);
    if (!overId) return;

    const from = locate.get(id);
    const to = columnOf(overId);
    if (!from || !to) return;

    const next: BoardState = { ...board, [from]: [...board[from]], [to]: [...board[to]] };
    const fromIdx = next[from].findIndex((c) => c.id === id);
    if (fromIdx === -1) return;
    const [moved] = next[from].splice(fromIdx, 1);

    let insertAt = next[to].length;
    if (!overId.startsWith("col:")) {
      const overIdx = next[to].findIndex((c) => c.id === overId);
      if (overIdx !== -1) insertAt = overIdx;
    }
    if (from === to) {
      // arrayMove within column
      next[to] = arrayMove(board[to], fromIdx, Math.min(insertAt, board[to].length - 1));
    } else {
      next[to].splice(insertAt, 0, moved);
    }

    setBoard(next);

    if (from !== to) {
      const res = await moveApplicationAction({ id, status: to });
      if (!res.ok) {
        toast.error(res.error);
        router.refresh();
        return;
      }
    }
    await reorderApplicationsAction({ status: to, orderedIds: next[to].map((c) => c.id) });
    router.refresh();
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUS_ORDER.map((status) => (
            <Column key={status} status={status} cards={board[status] ?? []} onOpen={setOpenId} />
          ))}
        </div>
        <DragOverlay>{activeCard ? <ApplicationCard card={activeCard} overlay /> : null}</DragOverlay>
      </DndContext>

      {openId ? (
        <ApplicationDetailDialog
          applicationId={openId}
          open={!!openId}
          onOpenChange={(o) => !o && setOpenId(null)}
        />
      ) : null}
    </>
  );
}
