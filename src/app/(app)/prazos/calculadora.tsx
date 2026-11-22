"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarCheck2, CalendarClock, ListPlus, Scale } from "lucide-react";
import { Card, Campo, cx } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { calcularPrazo } from "@/lib/prazos";

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const lerISO = (s: string) => {
  const [a, m, d] = s.split("-").map(Number);
  return new Date(a, m - 1, d, 12);
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
const fmtLongo = (d: Date) => d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const ATALHOS = [
  ["5", "Embargos de declaração"],
  ["15", "Contestação / apelação / agravo"],
  ["8", "Recurso trabalhista"],
  ["30", "Prazo da Fazenda (dobro)"],
];

export function Calculadora() {
  const [data, setData] = useState(hojeISO());
  const [dias, setDias] = useState("15");
  const [uteis, setUteis] = useState(true);
  const [dje, setDje] = useState(true);
  const [recesso, setRecesso] = useState(true);
  const [extras, setExtras] = useState("");

  const resultado = useMemo(() => {
    const n = Number(dias);
    if (!data || !Number.isInteger(n) || n < 1 || n > 365) return null;
    const feriadosExtras = extras
      .split(/[\s,;]+/)
      .map((t) => t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))
      .filter(Boolean)
      .map((m) => new Date(Number(m![3]), Number(m![2]) - 1, Number(m![1]), 12));
    return calcularPrazo({ inicio: lerISO(data), dias: n, uteis, disponibilizacao: dje, recesso, feriadosExtras });
  }, [data, dias, uteis, dje, recesso, extras]);

  const pulados = resultado ? [...resultado.linha, ...resultado.prorrogado].filter((d) => !d.conta && d.motivo && !["Sábado", "Domingo"].includes(d.motivo)) : [];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <Card titulo={<><Scale className="size-4 text-primary" /> Dados do prazo</>}>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo={dje ? "Disponibilização no DJe" : "Data da intimação"}>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="campo" />
            </Campo>
            <Campo rotulo="Prazo (dias)">
              <input type="number" min={1} max={365} value={dias} onChange={(e) => setDias(e.target.value)} className="campo" />
            </Campo>
          </div>
          <div className="flex flex-wrap gap-2">
            {ATALHOS.map(([n, r]) => (
              <button
                key={r}
                type="button"
                onClick={() => setDias(n)}
                className={cx("rounded-full border px-3 py-1 text-xs transition-colors", dias === n ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}
              >
                {n} dias · {r}
              </button>
            ))}
          </div>
          <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <label className="flex items-center gap-2.5">
              <input type="checkbox" checked={uteis} onChange={(e) => setUteis(e.target.checked)} /> Contar em dias úteis (CPC, art. 219)
            </label>
            <label className="flex items-center gap-2.5">
              <input type="checkbox" checked={dje} onChange={(e) => setDje(e.target.checked)} /> Data informada é a disponibilização no DJe (Lei 11.419/06)
            </label>
            <label className="flex items-center gap-2.5">
              <input type="checkbox" checked={recesso} onChange={(e) => setRecesso(e.target.checked)} /> Suspender no recesso de 20/12 a 20/01 (CPC, art. 220)
            </label>
          </div>
          <Campo rotulo="Feriados locais e suspensões do tribunal" dica="Datas no formato dd/mm/aaaa, separadas por espaço ou vírgula">
            <textarea value={extras} onChange={(e) => setExtras(e.target.value)} rows={2} placeholder="25/01/2027 09/07/2027" className="campo" />
          </Campo>
        </div>
      </Card>

      <div className="space-y-6">
        {resultado ? (
          <>
            <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-lg shadow-primary/20">
              <CalendarCheck2 aria-hidden className="absolute -right-4 -bottom-4 size-32 opacity-10" />
              <p className="text-sm opacity-80">O prazo termina em</p>
              <p className="mt-1 font-heading text-4xl font-semibold first-letter:uppercase">{fmtLongo(resultado.final)}</p>
              <p className="mt-3 text-sm opacity-80">
                {dje && <>Publicação considerada em {resultado.publicacao.toLocaleDateString("pt-BR")} · </>}
                Início da contagem em {resultado.linha[0]?.data.toLocaleDateString("pt-BR")}
              </p>
              <Button asChild variant="secondary" className="mt-5">
                <Link href={`/atividades?nova=1&prazo=${iso(resultado.final)}&titulo=${encodeURIComponent(`Prazo de ${dias} dias`)}`}>
                  <ListPlus /> Criar tarefa com este prazo
                </Link>
              </Button>
            </div>

            {pulados.length > 0 && (
              <Card titulo={<><CalendarClock className="size-4 text-primary" /> Dias não contados no período</>}>
                <ul className="space-y-1.5 text-sm">
                  {pulados.map((d) => (
                    <li key={iso(d.data)} className="flex justify-between gap-3">
                      <span className="tabular text-muted-foreground">{fmt(d.data)}</span>
                      <span className="text-right">{d.motivo}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card titulo="Contagem dia a dia">
              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7">
                {[...resultado.linha, ...resultado.prorrogado].map((d) => (
                  <div
                    key={iso(d.data)}
                    title={d.motivo ?? `Dia ${d.numero}`}
                    className={cx(
                      "flex flex-col items-center rounded-md border px-1 py-1.5 text-center",
                      d.conta ? "border-primary/30 bg-primary/5" : "bg-muted/40 text-muted-foreground opacity-70",
                      iso(d.data) === iso(resultado.final) && "border-primary bg-primary text-primary-foreground opacity-100",
                    )}
                  >
                    <span className="text-[10px] uppercase">{d.data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</span>
                    <span className="text-sm font-semibold">{d.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                    <span className="text-[10px]">{d.conta ? `${d.numero}º` : "—"}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">Informe uma data e um prazo entre 1 e 365 dias.</p>
          </Card>
        )}
        <p className="text-xs text-muted-foreground">
          Considera feriados nacionais (inclusive Carnaval, Sexta-feira da Paixão e Corpus Christi). Confira sempre a portaria de expediente do tribunal: feriados
          locais e suspensões devem ser informados acima.
        </p>
      </div>
    </div>
  );
}
