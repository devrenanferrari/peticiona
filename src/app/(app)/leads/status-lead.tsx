"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { mudarStatusLead } from "./actions";

export const STATUS_LEAD: Record<string, [string, string]> = {
  NOVO: ["Novo", "bg-primary/10 text-primary"],
  EM_CONTATO: ["Em contato", "bg-warning/20 text-amber-800 dark:text-warning"],
  PROPOSTA: ["Proposta enviada", "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"],
  CONVERTIDO: ["Convertido", "bg-success/12 text-success"],
  DESCARTADO: ["Descartado", "bg-muted text-muted-foreground"],
};

export function SeletorStatusLead({ id, status }: { id: string; status: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <select
      value={status}
      disabled={pendente}
      aria-label="Status do lead"
      onChange={(e) => {
        const novo = e.target.value;
        iniciar(async () => {
          await mudarStatusLead(id, novo);
          toast.success(`Lead marcado como “${STATUS_LEAD[novo][0]}”`);
        });
      }}
      className={cn("h-7 cursor-pointer appearance-none rounded-md border-0 px-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring", STATUS_LEAD[status]?.[1])}
    >
      {Object.entries(STATUS_LEAD).map(([v, [r]]) => (
        <option key={v} value={v} className="bg-popover text-popover-foreground">
          {r}
        </option>
      ))}
    </select>
  );
}
