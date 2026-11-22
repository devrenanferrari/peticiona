import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { AreaTexto, Botao, BotaoLink, Cabecalho, Campo, Card, Entrada, Selecao, cx } from "@/components/kit";
import { filtroCarteira } from "@/lib/acesso";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { inputDataHora, proximaHoraCheia } from "@/lib/format";
import { excluirEvento, salvarEvento } from "./actions";

export const metadata = { title: "Agenda" };

const TIPOS: Record<string, [string, string]> = {
  AUDIENCIA: ["Audiência", "bg-red-100 text-red-800"],
  REUNIAO: ["Reunião", "bg-primary/15 text-primary"],
  PRAZO: ["Prazo", "bg-amber-100 text-amber-800"],
  COMPROMISSO: ["Compromisso", "bg-muted text-foreground"],
};
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const chaveDia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const mesParam = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export default async function Agenda({ searchParams }: { searchParams: Promise<{ mes?: string; novo?: string; editar?: string; processo?: string; dia?: string }> }) {
  const sp = await searchParams;
  const u = await exigirUsuario();
  const [ano, mes] = (sp.mes ?? mesParam(new Date())).split("-").map(Number);
  const primeiro = new Date(ano, mes - 1, 1);
  const inicioGrade = new Date(primeiro);
  inicioGrade.setDate(1 - primeiro.getDay());
  const fimGrade = new Date(inicioGrade);
  fimGrade.setDate(inicioGrade.getDate() + 42);

  const carteira = await filtroCarteira(u);
  const [eventos, tarefas, usuarios, processos, editando, audiencias] = await Promise.all([
    db.evento.findMany({ where: { escritorioId: u.escritorioId, inicio: { gte: inicioGrade, lt: fimGrade } }, orderBy: { inicio: "asc" } }),
    db.tarefa.findMany({ where: { escritorioId: u.escritorioId, ...carteira, concluida: false, prazo: { gte: inicioGrade, lt: fimGrade } } }),
    db.usuario.findMany({ where: { escritorioId: u.escritorioId, ativo: true } }),
    db.processo.findMany({ where: { escritorioId: u.escritorioId, status: "ATIVO", ...carteira }, include: { cliente: true } }),
    sp.editar ? db.evento.findFirst({ where: { id: sp.editar, escritorioId: u.escritorioId } }) : null,
    db.audiencia.findMany({
      where: { escritorioId: u.escritorioId, status: "DESIGNADA", data: { gte: inicioGrade, lt: fimGrade }, processo: carteira },
      include: { processo: { select: { titulo: true } } },
    }),
  ]);

  const porDia = new Map<string, { id: string; titulo: string; tipo: string; hora?: string; tarefa?: boolean; audiencia?: boolean }[]>();
  for (const e of eventos) {
    const k = chaveDia(e.inicio);
    porDia.set(k, [...(porDia.get(k) ?? []), { id: e.id, titulo: e.titulo, tipo: e.tipo, hora: e.inicio.toTimeString().slice(0, 5) }]);
  }
  for (const t of tarefas) {
    const k = chaveDia(t.prazo!);
    porDia.set(k, [...(porDia.get(k) ?? []), { id: t.id, titulo: t.titulo, tipo: "PRAZO", tarefa: true }]);
  }
  for (const a of audiencias) {
    const k = chaveDia(a.data);
    const item = { id: a.id, titulo: `Audiência · ${a.processo.titulo}`, tipo: "AUDIENCIA", hora: a.data.toTimeString().slice(0, 5), audiencia: true };
    porDia.set(k, [...(porDia.get(k) ?? []), item].sort((x, y) => (x.hora ?? "99").localeCompare(y.hora ?? "99")));
  }

  const anterior = mesParam(new Date(ano, mes - 2, 1));
  const proximo = mesParam(new Date(ano, mes, 1));
  const hojeK = chaveDia(new Date());
  const dias = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicioGrade);
    d.setDate(inicioGrade.getDate() + i);
    return d;
  });
  const e = editando;
  const inicioPadrao = sp.dia ? `${sp.dia}T09:00` : inputDataHora(proximaHoraCheia());

  return (
    <>
      <Cabecalho
        titulo="Agenda"
        acoes={
          <BotaoLink href={`/agenda?mes=${mesParam(primeiro)}&novo=1`}>
            <Plus size={16} /> Novo compromisso
          </BotaoLink>
        }
      />

      {(sp.novo || e) && (
        <Card titulo={e ? "Editar compromisso" : "Novo compromisso"} className="mb-6">
          <form action={salvarEvento} className="grid gap-4 md:grid-cols-4">
            {e && <input type="hidden" name="id" value={e.id} />}
            <Campo rotulo="Título *" className="md:col-span-2">
              <Entrada name="titulo" required autoFocus defaultValue={e?.titulo} />
            </Campo>
            <Campo rotulo="Tipo">
              <Selecao name="tipo" defaultValue={e?.tipo ?? "COMPROMISSO"} opcoes={Object.entries(TIPOS).map(([v, [r]]) => [v, r])} />
            </Campo>
            <Campo rotulo="Responsável">
              <Selecao name="usuarioId" defaultValue={e?.usuarioId ?? u.id} vazio="—" opcoes={usuarios.map((x) => [x.id, x.nome])} />
            </Campo>
            <Campo rotulo="Início *">
              <Entrada type="datetime-local" name="inicio" required defaultValue={e ? inputDataHora(e.inicio) : inicioPadrao} />
            </Campo>
            <Campo rotulo="Fim">
              <Entrada type="datetime-local" name="fim" defaultValue={inputDataHora(e?.fim)} />
            </Campo>
            <Campo rotulo="Local / link">
              <Entrada name="local" defaultValue={e?.local ?? ""} />
            </Campo>
            <Campo rotulo="Processo">
              <Selecao name="processoId" defaultValue={e?.processoId ?? sp.processo ?? ""} vazio="—" opcoes={processos.map((p) => [p.id, `${p.titulo} (${p.cliente.nome})`])} />
            </Campo>
            <Campo rotulo="Descrição" className="md:col-span-4">
              <AreaTexto name="descricao" rows={2} defaultValue={e?.descricao ?? ""} />
            </Campo>
            <div className="flex justify-end gap-2 md:col-span-4">
              <BotaoLink variante="secundario" href={`/agenda?mes=${mesParam(primeiro)}`}>
                Cancelar
              </BotaoLink>
              <Botao>Salvar</Botao>
            </div>
          </form>
          {e && (
            <form action={excluirEvento} className="mt-2">
              <input type="hidden" name="id" value={e.id} />
              <BotaoConfirmar mensagem="Excluir este compromisso?" variante="fantasma" className="text-destructive">
                Excluir
              </BotaoConfirmar>
            </form>
          )}
        </Card>
      )}

      <div className="mb-3 flex items-center gap-3">
        <Link href={`/agenda?mes=${anterior}`} className="rounded-lg p-1.5 hover:bg-card">
          <ChevronLeft />
        </Link>
        <h2 className="w-48 text-center text-lg font-semibold">
          {MESES[mes - 1]} {ano}
        </h2>
        <Link href={`/agenda?mes=${proximo}`} className="rounded-lg p-1.5 hover:bg-card">
          <ChevronRight />
        </Link>
        <Link href="/agenda" className="text-sm text-primary hover:underline">
          Hoje
        </Link>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-border bg-border shadow-sm" style={{ gap: 1 }}>
        {SEMANA.map((s) => (
          <div key={s} className="bg-muted/50 py-2 text-center text-xs font-medium text-muted-foreground">
            {s}
          </div>
        ))}
        {dias.map((d) => {
          const itens = porDia.get(chaveDia(d)) ?? [];
          const foraDoMes = d.getMonth() !== mes - 1;
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          return (
            <div key={iso} className={cx("min-h-28 bg-card p-1.5 transition-colors hover:bg-accent/40", foraDoMes && "bg-muted/25 opacity-60")}>
              <Link
                href={`/agenda?mes=${mesParam(primeiro)}&novo=1&dia=${iso}`}
                className={cx(
                  "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs hover:bg-accent",
                  chaveDia(d) === hojeK ? "bg-marca font-semibold text-white hover:bg-marca/90" : foraDoMes ? "text-muted-foreground" : "text-foreground",
                )}
                title="Adicionar compromisso neste dia"
              >
                {d.getDate()}
              </Link>
              <div className="space-y-0.5">
                {itens.slice(0, 4).map((it) => (
                  <Link
                    key={it.id}
                    href={it.tarefa ? `/atividades?editar=${it.id}` : it.audiencia ? `/audiencias?aba=todas&editar=${it.id}` : `/agenda?mes=${mesParam(primeiro)}&editar=${it.id}`}
                    className={cx("block truncate rounded px-1.5 py-0.5 text-xs", TIPOS[it.tipo]?.[1] ?? TIPOS.COMPROMISSO[1])}
                    title={it.titulo}
                  >
                    {it.hora && <b>{it.hora} </b>}
                    {it.tarefa && "☐ "}
                    {it.titulo}
                  </Link>
                ))}
                {itens.length > 4 && <p className="px-1 text-xs text-muted-foreground">+{itens.length - 4} mais</p>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
