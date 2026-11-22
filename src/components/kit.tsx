import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card as CardUI, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Alias mantido para os componentes existentes. */
export const cx = cn;

type Variante = "primario" | "secundario" | "perigo" | "fantasma" | "sucesso";
const MAPA: Record<Variante, ComponentProps<typeof Button>["variant"]> = {
  primario: "default",
  secundario: "outline",
  perigo: "destructive",
  fantasma: "ghost",
  sucesso: "default",
};
const EXTRA: Partial<Record<Variante, string>> = {
  sucesso: "bg-success text-success-foreground hover:bg-success/90",
  primario: "shadow-[0_1px_2px_oklch(0.2_0.01_264/0.2)] hover:bg-primary/88",
  secundario: "bg-card shadow-(--sombra-cartao)",
};

export function Botao({ variante = "primario", className, ...p }: ComponentProps<"button"> & { variante?: Variante }) {
  return <Button variant={MAPA[variante]} className={cn("px-3", EXTRA[variante], className)} {...p} />;
}

export function BotaoLink({ variante = "primario", className, children, ...p }: ComponentProps<typeof Link> & { variante?: Variante }) {
  return (
    <Button asChild variant={MAPA[variante]} className={cn("px-3", EXTRA[variante], className)}>
      <Link {...p}>{children}</Link>
    </Button>
  );
}

/** Cabeçalho da página: faixa branca no topo, título, código da transação e ações. */
export function Cabecalho({
  titulo, subtitulo, acoes, codigo, abas,
}: { titulo: string; subtitulo?: ReactNode; acoes?: ReactNode; codigo?: string; abas?: ReactNode }) {
  return (
    <div className="-mx-3 -mt-4 mb-4 border-b bg-card px-3 shadow-(--sombra-cartao) md:-mx-6 md:-mt-5 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <h1 data-titulo-pagina className="titulo-grande flex items-center gap-2">
            {titulo}
            {codigo && <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] font-medium text-muted-foreground">{codigo}</span>}
          </h1>
          {subtitulo && <div className="mt-0.5 text-[0.8125rem] text-muted-foreground">{subtitulo}</div>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-1.5">{acoes}</div>}
      </div>
      {abas && <nav className="-mb-px flex gap-1 overflow-x-auto">{abas}</nav>}
    </div>
  );
}

/** Aba do cabeçalho (navegação por link, estilo "icon tab bar" do Fiori). */
export function Aba({ href, ativa, children, contagem }: { href: string; ativa?: boolean; children: ReactNode; contagem?: number }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-9 items-center gap-1.5 border-b-2 px-3 text-[0.8125rem] font-medium whitespace-nowrap transition-colors",
        ativa ? "border-marca text-marca" : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {contagem !== undefined && <span className={cn("tabular rounded-full px-1.5 text-[0.6875rem]", ativa ? "bg-marca-suave" : "bg-muted")}>{contagem}</span>}
    </Link>
  );
}

/** Bloco de campos "rótulo: valor" do cabeçalho de objeto (ficha do processo, empréstimo...). */
export function Atributos({ itens, className }: { itens: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("grid gap-x-8 gap-y-2.5 text-[0.8125rem] sm:grid-cols-2 lg:grid-cols-4", className)}>
      {itens.map(([r, v]) => (
        <div key={r} className="min-w-0">
          <dt className="text-[0.75rem] text-muted-foreground">{r}</dt>
          <dd className="truncate font-medium">{v || <span className="text-muted-foreground/60">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Card({ className, titulo, descricao, acoes, children }: { className?: string; titulo?: ReactNode; descricao?: ReactNode; acoes?: ReactNode; children: ReactNode }) {
  return (
    <CardUI className={cn("gap-4 [--card-spacing:--spacing(5)]", className)}>
      {(titulo || acoes) && (
        <CardHeader>
          {titulo && <CardTitle className="flex items-center gap-2 text-[0.9375rem] font-semibold tracking-[-0.01em] [&_svg]:text-marca">{titulo}</CardTitle>}
          {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
          {acoes && <CardAction>{acoes}</CardAction>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </CardUI>
  );
}

export function Indicador({
  rotulo, valor, detalhe, cor, icone: Icone, tom = "primario",
}: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; cor?: string; icone?: LucideIcon; tom?: "primario" | "sucesso" | "alerta" | "perigo" }) {
  const tons = { primario: "text-marca", sucesso: "text-success", alerta: "text-warning", perigo: "text-destructive" };
  return (
    <CardUI className="gap-0 p-5">
      <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground">
        {Icone && <Icone className={cn("size-3.5", tons[tom])} strokeWidth={2.25} />}
        {rotulo}
      </p>
      <p className={cn("tabular mt-2 text-[1.75rem] leading-none font-semibold tracking-[-0.025em]", cor ?? "text-foreground")}>{valor}</p>
      {detalhe && <p className="mt-2 text-xs text-muted-foreground">{detalhe}</p>}
    </CardUI>
  );
}

export function Campo({ rotulo, children, className, dica }: { rotulo: string; children: ReactNode; className?: string; dica?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[0.8125rem] font-medium text-foreground/85">{rotulo}</span>
      {children}
      {dica && <span className="text-xs text-muted-foreground">{dica}</span>}
    </label>
  );
}

export function Entrada(p: ComponentProps<"input">) {
  return <input {...p} className={cn("campo", p.className)} />;
}

export function Selecao({ opcoes, vazio, ...p }: ComponentProps<"select"> & { opcoes: (string | [string, string])[]; vazio?: string }) {
  return (
    <select {...p} className={cn("campo", p.className)}>
      {vazio !== undefined && <option value="">{vazio}</option>}
      {opcoes.map((o) => {
        const [valor, rotulo] = Array.isArray(o) ? o : [o, o];
        return (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        );
      })}
    </select>
  );
}

export function AreaTexto(p: ComponentProps<"textarea">) {
  return <textarea rows={4} {...p} className={cn("campo", p.className)} />;
}

const CORES_ETIQUETA = {
  cinza: "bg-foreground/[0.06] text-foreground/70",
  azul: "bg-marca-suave text-[color-mix(in_oklch,var(--marca),black_25%)] dark:text-marca",
  verde: "bg-success/12 text-success",
  amarelo: "bg-warning/18 text-warning-foreground dark:text-warning",
  vermelho: "bg-destructive/10 text-destructive",
  roxo: "bg-[oklch(0.6_0.11_245/0.12)] text-[oklch(0.45_0.12_245)] dark:text-[oklch(0.78_0.1_245)]",
};
export type CorEtiqueta = keyof typeof CORES_ETIQUETA;

export function Etiqueta({ cor = "cinza", children }: { cor?: CorEtiqueta; children: ReactNode }) {
  return (
    <Badge variant="secondary" className={cn("h-[1.375rem] rounded-full border-0 px-2.5 text-[0.75rem] font-medium", CORES_ETIQUETA[cor])}>
      {children}
    </Badge>
  );
}

export function Vazio({ children, icone: Icone = Inbox, acao }: { children: ReactNode; icone?: LucideIcon; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-12 text-center">
      <Icone className="size-8 text-muted-foreground/45" strokeWidth={1.5} />
      <p className="max-w-sm text-[0.9375rem] text-muted-foreground">{children}</p>
      {acao}
    </div>
  );
}

export function Tabela({ colunas, children }: { colunas: string[]; children: ReactNode }) {
  return (
    <CardUI className="gap-0 overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {colunas.map((c, i) => (
              <TableHead key={c + i} className="h-10 px-4 text-[0.75rem] font-semibold text-muted-foreground">
                {c}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr]:border-foreground/[0.06] [&_tr]:transition-colors [&_tr:hover]:bg-foreground/[0.025]">{children}</TableBody>
      </Table>
    </CardUI>
  );
}

export function Td({ className, ...p }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-middle text-[0.8125rem]", className)} {...p} />;
}

export function Busca({ valor, placeholder = "Buscar...", children }: { valor?: string; placeholder?: string; children?: ReactNode }) {
  return (
    <form className="mb-5 flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-sm">
        <svg className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input name="q" type="search" defaultValue={valor} placeholder={placeholder} className="campo border-transparent bg-foreground/[0.06] pl-9 shadow-none dark:bg-white/[0.08]" />
      </div>
      {children}
      <Botao variante="secundario" type="submit">
        Filtrar
      </Botao>
    </form>
  );
}

const STATUS_PROCESSO: Record<string, [string, CorEtiqueta, string]> = {
  ATIVO: ["Ativo", "verde", "bg-success"],
  SUSPENSO: ["Suspenso", "amarelo", "bg-warning"],
  ENCERRADO: ["Encerrado", "cinza", "bg-muted-foreground"],
  ARQUIVADO: ["Arquivado", "cinza", "bg-muted-foreground"],
};

export function StatusProcesso({ status }: { status: string }) {
  const [rotulo, cor, ponto] = STATUS_PROCESSO[status] ?? [status, "cinza", "bg-muted-foreground"];
  return (
    <Etiqueta cor={cor}>
      <span className={cn("size-1.5 rounded-full", ponto)} />
      {rotulo}
    </Etiqueta>
  );
}
