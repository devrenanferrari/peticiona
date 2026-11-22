"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronRight, Columns3, Download, Filter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Tom = "verde" | "amarelo" | "vermelho" | "cinza" | "azul" | "roxo";
/** Valor de uma célula. Datas chegam como string ISO. Status chega como { texto, tom }. */
export type Celula = string | number | boolean | null | undefined | { texto: string; tom: Tom };
export type Linha = { id: string; href?: string } & Record<string, Celula>;

export type Coluna = {
  chave: string;
  rotulo: string;
  tipo?: "texto" | "mono" | "data" | "dataHora" | "prazo" | "moeda" | "percentual" | "numero" | "status";
  /** Soma a coluna no rodapé (moeda ou número). */
  total?: boolean;
  /** Começa escondida; o usuário liga em "Colunas". */
  oculta?: boolean;
  /** A célula vira link para a linha. */
  link?: boolean;
  /** Permite quebrar linha (textos longos). */
  quebra?: boolean;
  largura?: string;
};

const fData = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });
const fDataHora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
const fMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fNum = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const ehStatus = (v: Celula): v is { texto: string; tom: Tom } => typeof v === "object" && v !== null;
const NUMERICOS = new Set(["moeda", "percentual", "numero"]);
const EVENTO_COLUNAS = "grade-colunas";

/** Dias entre hoje e a data (negativo = vencido), no fuso de São Paulo. */
function diasAte(iso: string) {
  const dia = (d: Date) => {
    const [a, m, x] = d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).split("-").map(Number);
    return Date.UTC(a, m - 1, x);
  };
  return Math.round((dia(new Date(iso)) - dia(new Date())) / 86400000);
}

function texto(v: Celula, tipo: Coluna["tipo"]): string {
  if (v === null || v === undefined || v === "") return "";
  if (ehStatus(v)) return v.texto;
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  switch (tipo) {
    case "data":
    case "prazo":
      return fData.format(new Date(String(v)));
    case "dataHora":
      return fDataHora.format(new Date(String(v)));
    case "moeda":
      return fMoeda.format(Number(v));
    case "percentual":
      return `${fNum.format(Number(v))}%`;
    case "numero":
      return fNum.format(Number(v));
    default:
      return String(v);
  }
}

const TONS: Record<Tom, string> = {
  verde: "bg-success/12 text-success",
  amarelo: "bg-warning/20 text-warning-foreground dark:text-warning",
  vermelho: "bg-destructive/10 text-destructive",
  cinza: "bg-foreground/[0.07] text-foreground/70",
  azul: "bg-marca-suave text-[color-mix(in_oklch,var(--marca),black_30%)] dark:text-marca",
  roxo: "bg-[oklch(0.6_0.11_245/0.12)] text-[oklch(0.45_0.12_245)] dark:text-[oklch(0.78_0.1_245)]",
};

export function Pilula({ tom, children }: { tom: Tom; children: ReactNode }) {
  return <span className={cn("inline-flex h-5 items-center gap-1 rounded-sm px-1.5 text-[0.71875rem] font-semibold whitespace-nowrap", TONS[tom])}>{children}</span>;
}

/** Semáforo de prazo: vermelho vencido/hoje, amarelo até 3 dias, verde depois. */
export function Prazo({ iso }: { iso: string }) {
  const d = diasAte(iso);
  const ponto = d <= 0 ? "bg-destructive" : d <= 3 ? "bg-warning" : "bg-success";
  const rel = d < 0 ? `vencido ${-d}d` : d === 0 ? "hoje" : d === 1 ? "amanhã" : `${d}d`;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={cn("size-2 shrink-0 rounded-full", ponto)} />
      <span className="tabular">{fData.format(new Date(iso))}</span>
      <span className={cn("text-[0.6875rem]", d <= 0 ? "font-semibold text-destructive" : "text-muted-foreground")}>{rel}</span>
    </span>
  );
}

function ConteudoCelula({ v, c }: { v: Celula; c: Coluna }) {
  if (v === null || v === undefined || v === "") return <span className="text-muted-foreground/50">—</span>;
  if (ehStatus(v)) return <Pilula tom={v.tom}>{v.texto}</Pilula>;
  if (c.tipo === "prazo") return <Prazo iso={String(v)} />;
  return <>{texto(v, c.tipo)}</>;
}

function paraCsv(colunas: Coluna[], linhas: Linha[]) {
  const esc = (s: string) => (/[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const valor = (v: Celula, c: Coluna) => {
    if (v === null || v === undefined) return "";
    // Números no formato brasileiro, sem "R$", para o Excel somar.
    if (NUMERICOS.has(c.tipo ?? "") && typeof v === "number") return String(v).replace(".", ",");
    return texto(v, c.tipo === "prazo" ? "data" : c.tipo);
  };
  const cab = colunas.map((c) => esc(c.rotulo)).join(";");
  const corpo = linhas.map((l) => colunas.map((c) => esc(valor(l[c.chave], c))).join(";"));
  return "﻿" + [cab, ...corpo].join("\r\n");
}

/**
 * Grade de dados no estilo das listas de ERP: busca, filtro por coluna, ordenação,
 * escolha de colunas (lembrada por navegador), totais e exportação para Excel.
 */
export function Grade({
  id, titulo, colunas, linhas, acoes, vazio = "Nenhum registro.", rodape,
}: {
  id: string;
  titulo?: ReactNode;
  colunas: Coluna[];
  linhas: Linha[];
  acoes?: ReactNode;
  vazio?: string;
  rodape?: ReactNode;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [verFiltros, setVerFiltros] = useState(false);
  const [ordem, setOrdem] = useState<{ chave: string; dir: 1 | -1 } | null>(null);
  const padrao = useMemo(() => colunas.filter((c) => !c.oculta).map((c) => c.chave), [colunas]);

  // Colunas escolhidas ficam no navegador, por grade.
  const chaveSalva = `grade:${id}`;
  const salvo = useSyncExternalStore(
    (avisar) => {
      window.addEventListener("storage", avisar);
      window.addEventListener(EVENTO_COLUNAS, avisar);
      return () => {
        window.removeEventListener("storage", avisar);
        window.removeEventListener(EVENTO_COLUNAS, avisar);
      };
    },
    () => {
      try {
        return localStorage.getItem(chaveSalva);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const visiveis = useMemo(() => {
    try {
      const lista = salvo ? (JSON.parse(salvo) as string[]).filter((k) => colunas.some((c) => c.chave === k)) : [];
      if (lista.length) return lista;
    } catch {}
    return padrao;
  }, [salvo, colunas, padrao]);

  const alternarColuna = (chave: string) => {
    const nova = visiveis.includes(chave) ? visiveis.filter((k) => k !== chave) : colunas.map((c) => c.chave).filter((k) => k === chave || visiveis.includes(k));
    if (!nova.length) return;
    try {
      localStorage.setItem(chaveSalva, JSON.stringify(nova));
    } catch {}
    window.dispatchEvent(new Event(EVENTO_COLUNAS));
  };

  const cols = colunas.filter((c) => visiveis.includes(c.chave));

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const ativos = Object.entries(filtros).filter(([, v]) => v.trim());
    let r = linhas.filter((l) => {
      if (q && !colunas.some((c) => texto(l[c.chave], c.tipo).toLowerCase().includes(q))) return false;
      return ativos.every(([k, v]) => {
        const c = colunas.find((x) => x.chave === k);
        return texto(l[k], c?.tipo).toLowerCase().includes(v.trim().toLowerCase());
      });
    });
    if (ordem) {
      const c = colunas.find((x) => x.chave === ordem.chave);
      const chaveOrd = (v: Celula) => (ehStatus(v) ? v.texto : v);
      r = [...r].sort((a, b) => {
        const va = chaveOrd(a[ordem.chave]);
        const vb = chaveOrd(b[ordem.chave]);
        if (va == null || va === "") return 1;
        if (vb == null || vb === "") return -1;
        if (NUMERICOS.has(c?.tipo ?? "")) return (Number(va) - Number(vb)) * ordem.dir;
        return String(va).localeCompare(String(vb), "pt-BR", { numeric: true }) * ordem.dir;
      });
    }
    return r;
  }, [linhas, colunas, busca, filtros, ordem]);

  const totais = cols.some((c) => c.total);
  const exportar = () => {
    const blob = new Blob([paraCsv(cols, filtradas)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${id}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const filtrosAtivos = Object.values(filtros).filter((v) => v.trim()).length;

  return (
    <section className="overflow-hidden rounded-md border bg-card shadow-(--sombra-cartao)">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        {titulo && (
          <h2 className="mr-2 text-[0.875rem] font-semibold">
            {titulo} <span className="font-normal text-muted-foreground tabular">({filtradas.length}{filtradas.length !== linhas.length ? ` de ${linhas.length}` : ""})</span>
          </h2>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <label className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar"
              className="h-7 w-44 rounded-sm border bg-background pr-2 pl-7 text-[0.8125rem] outline-none focus:border-marca"
            />
          </label>
          <BotaoBarra ativo={verFiltros || filtrosAtivos > 0} onClick={() => setVerFiltros((v) => !v)} titulo="Filtrar por coluna">
            <Filter className="size-3.5" /> Filtros{filtrosAtivos > 0 && ` (${filtrosAtivos})`}
          </BotaoBarra>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <BotaoBarra titulo="Escolher colunas">
                <Columns3 className="size-3.5" /> Colunas
              </BotaoBarra>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
              <DropdownMenuLabel className="text-xs">Colunas visíveis</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {colunas.map((c) => (
                <DropdownMenuCheckboxItem key={c.chave} checked={visiveis.includes(c.chave)} onCheckedChange={() => alternarColuna(c.chave)} onSelect={(e) => e.preventDefault()}>
                  {c.rotulo}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <BotaoBarra onClick={exportar} titulo="Exportar para Excel (CSV)">
            <Download className="size-3.5" /> Excel
          </BotaoBarra>
          {acoes}
        </div>
      </div>

      <div className="max-h-[calc(100svh-15rem)] overflow-auto">
        <table className="w-full border-collapse text-[0.8125rem]">
          <thead className="sticky top-0 z-[1] bg-muted">
            <tr>
              {cols.map((c) => {
                const ativa = ordem?.chave === c.chave;
                return (
                  <th
                    key={c.chave}
                    style={{ width: c.largura }}
                    className={cn("h-8 border-b px-3 text-left text-[0.75rem] font-semibold whitespace-nowrap text-muted-foreground", NUMERICOS.has(c.tipo ?? "") && "text-right")}
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => setOrdem(ativa ? (ordem!.dir === 1 ? { chave: c.chave, dir: -1 } : null) : { chave: c.chave, dir: 1 })}
                    >
                      {c.rotulo}
                      {ativa && (ordem!.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </button>
                  </th>
                );
              })}
              <th className="w-6 border-b" />
            </tr>
            {verFiltros && (
              <tr>
                {cols.map((c) => (
                  <th key={c.chave} className="border-b bg-muted px-2 py-1">
                    <input
                      value={filtros[c.chave] ?? ""}
                      onChange={(e) => setFiltros((f) => ({ ...f, [c.chave]: e.target.value }))}
                      placeholder="contém…"
                      className="h-6 w-full min-w-16 rounded-sm border bg-background px-1.5 text-[0.75rem] font-normal outline-none focus:border-marca"
                    />
                  </th>
                ))}
                <th className="border-b bg-muted">
                  {filtrosAtivos > 0 && (
                    <button type="button" title="Limpar filtros" onClick={() => setFiltros({})} className="text-muted-foreground hover:text-foreground">
                      <X className="size-3.5" />
                    </button>
                  )}
                </th>
              </tr>
            )}
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 1} className="px-3 py-10 text-center text-muted-foreground">
                  {linhas.length === 0 ? vazio : "Nenhum registro com esses filtros."}
                </td>
              </tr>
            ) : (
              filtradas.map((l) => (
                <tr
                  key={l.id}
                  onClick={(e) => {
                    if (!l.href || (e.target as HTMLElement).closest("a,button,input,form")) return;
                    router.push(l.href);
                  }}
                  className={cn("border-b border-foreground/[0.06] last:border-0 even:bg-foreground/[0.015] hover:bg-marca-suave/60", l.href && "cursor-pointer")}
                >
                  {cols.map((c) => (
                    <td
                      key={c.chave}
                      className={cn(
                        "h-8 px-3 py-1 align-middle",
                        c.quebra ? "min-w-48" : "whitespace-nowrap",
                        c.tipo === "mono" && "font-mono text-[0.75rem]",
                        NUMERICOS.has(c.tipo ?? "") && "text-right tabular",
                      )}
                    >
                      {c.link && l.href ? (
                        <Link href={l.href} className="font-medium text-[color-mix(in_oklch,var(--marca),black_25%)] hover:underline dark:text-marca">
                          <ConteudoCelula v={l[c.chave]} c={c} />
                        </Link>
                      ) : (
                        <ConteudoCelula v={l[c.chave]} c={c} />
                      )}
                    </td>
                  ))}
                  <td className="w-6 pr-2 text-muted-foreground/50">{l.href && <ChevronRight className="size-3.5" />}</td>
                </tr>
              ))
            )}
          </tbody>
          {totais && filtradas.length > 0 && (
            <tfoot className="sticky bottom-0 bg-muted font-semibold">
              <tr>
                {cols.map((c, i) => (
                  <td key={c.chave} className={cn("h-8 border-t px-3 whitespace-nowrap", NUMERICOS.has(c.tipo ?? "") && "text-right tabular")}>
                    {c.total ? texto(filtradas.reduce((s, l) => s + (Number(l[c.chave]) || 0), 0), c.tipo) : i === 0 ? "Total" : ""}
                  </td>
                ))}
                <td className="border-t" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {rodape && <div className="border-t px-3 py-2 text-xs text-muted-foreground">{rodape}</div>}
    </section>
  );
}

function BotaoBarra({ ativo, titulo, className, children, ...p }: React.ComponentProps<"button"> & { ativo?: boolean; titulo?: string }) {
  return (
    <button
      type="button"
      title={titulo}
      {...p}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-sm border px-2 text-[0.8125rem] font-medium text-foreground/80 transition-colors hover:bg-muted",
        ativo && "border-marca/50 bg-marca-suave text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
