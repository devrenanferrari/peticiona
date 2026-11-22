"use client";

import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHAVE = "peticiona_cronometro";

/** Cronômetro que sobrevive a recarregar a página e preenche o campo de duração. */
export function Cronometro({ alvo }: { alvo: string }) {
  const [inicio, setInicio] = useState<number | null>(null);
  const [acumulado, setAcumulado] = useState(0);
  const [agora, setAgora] = useState(0);

  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
      if (salvo) {
        // Restaura o estado salvo de uma visita anterior (fonte externa: localStorage).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setInicio(salvo.inicio);
        setAcumulado(salvo.acumulado);
      }
    } catch {}
    setAgora(Date.now());
  }, []);

  useEffect(() => {
    if (!inicio) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inicio]);

  const salvar = (i: number | null, a: number) => {
    setInicio(i);
    setAcumulado(a);
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ inicio: i, acumulado: a }));
    } catch {}
  };

  const total = acumulado + (inicio ? Math.max(0, agora - inicio) : 0);
  const seg = Math.floor(total / 1000);
  const texto = `${String(Math.floor(seg / 3600)).padStart(2, "0")}:${String(Math.floor((seg % 3600) / 60)).padStart(2, "0")}:${String(seg % 60).padStart(2, "0")}`;

  function preencher(ms: number) {
    const min = Math.max(1, Math.round(ms / 60000));
    const el = document.getElementById(alvo) as HTMLInputElement | null;
    if (el) el.value = `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-br from-primary/10 to-transparent p-4">
      <span className={`tabular font-mono text-3xl font-semibold tracking-tight ${inicio ? "text-primary" : ""}`}>{texto}</span>
      <div className="ml-auto flex gap-1.5">
        {inicio ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const a = acumulado + (Date.now() - inicio);
              salvar(null, a);
              preencher(a);
            }}
          >
            <Pause /> Pausar
          </Button>
        ) : (
          <Button type="button" onClick={() => salvar(Date.now(), acumulado)}>
            <Play /> {acumulado ? "Continuar" : "Iniciar"}
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon" aria-label="Zerar cronômetro" onClick={() => salvar(null, 0)}>
          <RotateCcw />
        </Button>
      </div>
    </div>
  );
}
