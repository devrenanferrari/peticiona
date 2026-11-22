"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cx } from "@/components/kit";
import { moverEtapa } from "../processos/actions";

type Cartao = { id: string; titulo: string; cliente: string; area: string | null; responsavel: string | null; etapaId: string; honorarios: number | null };
type Coluna = { id: string; nome: string };

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const iniciais = (n: string) => n.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

function ConteudoCartao({ c, arrastando }: { c: Cartao; arrastando?: boolean }) {
  return (
    <div
      className={cx(
        "group rounded-xl border bg-card p-3.5 shadow-xs transition-shadow",
        arrastando ? "rotate-2 shadow-xl ring-2 ring-primary/40" : "hover:shadow-md",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Link href={`/processos/${c.id}`} className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary" onPointerDown={(e) => e.stopPropagation()}>
            {c.titulo}
          </Link>
          <p className="mt-1 truncate text-xs text-muted-foreground">{c.cliente}</p>
        </div>
        <GripVertical className="size-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {c.area && <span className="truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">{c.area}</span>}
          {c.honorarios ? <span className="tabular text-[11px] font-medium text-success">{brl.format(c.honorarios)}</span> : null}
        </div>
        {c.responsavel && (
          <Avatar className="size-6" title={c.responsavel}>
            <AvatarFallback className="bg-muted text-[10px] font-semibold">{iniciais(c.responsavel)}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}

function CartaoArrastavel({ c }: { c: Cartao }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: c.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cx("cursor-grab touch-none active:cursor-grabbing", isDragging && "opacity-30")}>
      <ConteudoCartao c={c} />
    </div>
  );
}

function ColunaKanban({ col, itens }: { col: Coluna; itens: Cartao[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const total = itens.reduce((s, c) => s + (c.honorarios ?? 0), 0);
  return (
    <div
      ref={setNodeRef}
      className={cx(
        "flex w-[290px] shrink-0 flex-col rounded-2xl border bg-muted/40 p-2.5 transition-colors",
        isOver && "border-primary/50 bg-primary/5 ring-2 ring-primary/20",
      )}
    >
      <div className="mb-2.5 flex items-center justify-between px-1.5 pt-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{col.nome}</h3>
          <span className="tabular rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground shadow-xs">{itens.length}</span>
        </div>
        {total > 0 && <span className="tabular text-xs text-muted-foreground">{brl.format(total)}</span>}
      </div>
      <div className="flex min-h-28 flex-1 flex-col gap-2">
        {itens.map((c) => (
          <CartaoArrastavel key={c.id} c={c} />
        ))}
        {itens.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
            Arraste um processo para cá
          </div>
        )}
      </div>
    </div>
  );
}

export function Kanban({ colunas, cartoes }: { colunas: Coluna[]; cartoes: Cartao[] }) {
  const [, iniciar] = useTransition();
  const [ativo, setAtivo] = useState<Cartao | null>(null);
  const [otimistas, mover] = useOptimistic(cartoes, (atual, { id, etapaId }: { id: string; etapaId: string }) =>
    atual.map((c) => (c.id === id ? { ...c, etapaId } : c)),
  );
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  function inicio(e: DragStartEvent) {
    setAtivo(otimistas.find((c) => c.id === e.active.id) ?? null);
  }

  function fim(e: DragEndEvent) {
    setAtivo(null);
    const id = String(e.active.id);
    const etapaId = e.over ? String(e.over.id) : null;
    if (!etapaId || otimistas.find((c) => c.id === id)?.etapaId === etapaId) return;
    const destino = colunas.find((c) => c.id === etapaId)?.nome;
    iniciar(async () => {
      mover({ id, etapaId });
      try {
        await moverEtapa(id, etapaId);
        toast.success(`Processo movido para “${destino}”`);
      } catch {
        toast.error("Não foi possível mover o processo.");
      }
    });
  }

  return (
    <DndContext id="crm-kanban" sensors={sensores} collisionDetection={closestCorners} onDragStart={inicio} onDragEnd={fim} onDragCancel={() => setAtivo(null)}>
      <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-4 md:-mx-6 md:px-6">
        {colunas.map((col) => (
          <ColunaKanban key={col.id} col={col} itens={otimistas.filter((c) => c.etapaId === col.id)} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>{ativo ? <ConteudoCartao c={ativo} arrastando /> : null}</DragOverlay>
    </DndContext>
  );
}
