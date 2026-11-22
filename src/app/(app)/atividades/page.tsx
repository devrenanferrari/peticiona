import Link from "next/link";
import { CheckCircle2, Circle, Plus, Star, Trash2 } from "lucide-react";
import { AreaTexto, Botao, BotaoLink, Cabecalho, Campo, Card, Entrada, Etiqueta, Selecao, Vazio, cx, type CorEtiqueta } from "@/components/kit";
import { filtroCarteira } from "@/lib/acesso";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtData, inputData } from "@/lib/format";
import { alternarConclusao, alternarImportante, excluirTarefa, salvarTarefa } from "./actions";

export const metadata = { title: "Atividades" };

const PRIORIDADES: Record<string, [string, CorEtiqueta]> = {
  BAIXA: ["Baixa", "cinza"],
  NORMAL: ["Normal", "azul"],
  ALTA: ["Alta", "amarelo"],
  URGENTE: ["Urgente", "vermelho"],
};
const TIPOS: [string, string][] = [["TAREFA", "Tarefa"], ["PRAZO", "Prazo processual"], ["PETICAO", "Petição"], ["AUDIENCIA", "Audiência"], ["REUNIAO", "Reunião"]];

type Filtro = "pendentes" | "minhas" | "atrasadas" | "concluidas" | "todas";

export default async function Atividades({ searchParams }: { searchParams: Promise<{ f?: Filtro; nova?: string; processo?: string; editar?: string; q?: string; prazo?: string; titulo?: string }> }) {
  const sp = await searchParams;
  const filtro: Filtro = sp.f ?? "pendentes";
  const u = await exigirUsuario();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const carteira = await filtroCarteira(u);
  const where = {
    escritorioId: u.escritorioId,
    ...carteira,
    ...(sp.q ? { titulo: { contains: sp.q } } : {}),
    ...(filtro === "pendentes" && { concluida: false }),
    ...(filtro === "minhas" && { concluida: false, responsavelId: u.id }),
    ...(filtro === "atrasadas" && { concluida: false, prazo: { lt: hoje } }),
    ...(filtro === "concluidas" && { concluida: true }),
  };

  const [tarefas, usuarios, processos, editando] = await Promise.all([
    db.tarefa.findMany({
      where,
      include: { responsavel: true, processo: { include: { cliente: true } } },
      orderBy: filtro === "concluidas" ? [{ concluidaEm: "desc" }] : [{ importante: "desc" }, { prazo: "asc" }],
      take: 300,
    }),
    db.usuario.findMany({ where: { escritorioId: u.escritorioId, ativo: true }, orderBy: { nome: "asc" } }),
    db.processo.findMany({ where: { escritorioId: u.escritorioId, status: "ATIVO", ...carteira }, include: { cliente: true }, orderBy: { titulo: "asc" } }),
    sp.editar ? db.tarefa.findFirst({ where: { id: sp.editar, escritorioId: u.escritorioId } }) : null,
  ]);

  const mostrarForm = sp.nova || editando;
  const t = editando;
  const abas: [Filtro, string][] = [["pendentes", "Pendentes"], ["minhas", "Minhas"], ["atrasadas", "Atrasadas"], ["concluidas", "Concluídas"], ["todas", "Todas"]];

  return (
    <>
      <Cabecalho
        titulo="Atividades"
        subtitulo="Tarefas, prazos e compromissos da equipe"
        acoes={
          <BotaoLink href="/atividades?nova=1">
            <Plus size={16} /> Nova tarefa
          </BotaoLink>
        }
      />

      {mostrarForm && (
        <Card titulo={t ? "Editar tarefa" : "Nova tarefa"} className="mb-6">
          <form action={salvarTarefa} className="grid gap-4 md:grid-cols-4">
            {t && <input type="hidden" name="id" value={t.id} />}
            {sp.processo && <input type="hidden" name="voltar" value={`/processos/${sp.processo}`} />}
            <Campo rotulo="Título *" className="md:col-span-2">
              <Entrada name="titulo" required autoFocus defaultValue={t?.titulo ?? sp.titulo} />
            </Campo>
            <Campo rotulo="Tipo">
              <Selecao name="tipo" defaultValue={t?.tipo ?? "TAREFA"} opcoes={TIPOS} />
            </Campo>
            <Campo rotulo="Prazo">
              <Entrada type="date" name="prazo" defaultValue={t ? inputData(t.prazo) : sp.prazo ?? ""} />
            </Campo>
            <Campo rotulo="Responsável">
              <Selecao name="responsavelId" defaultValue={t?.responsavelId ?? u.id} vazio="—" opcoes={usuarios.map((x) => [x.id, x.nome])} />
            </Campo>
            <Campo rotulo="Prioridade">
              <Selecao name="prioridade" defaultValue={t?.prioridade ?? "NORMAL"} opcoes={Object.entries(PRIORIDADES).map(([v, [r]]) => [v, r])} />
            </Campo>
            <Campo rotulo="Pontos" dica="Usado na meta de produtividade">
              <Entrada type="number" min={0} name="pontos" defaultValue={t?.pontos ?? 1} />
            </Campo>
            <Campo rotulo="Processo">
              <Selecao name="processoId" defaultValue={t?.processoId ?? sp.processo ?? ""} vazio="—" opcoes={processos.map((p) => [p.id, `${p.titulo} (${p.cliente.nome})`])} />
            </Campo>
            <Campo rotulo="Descrição" className="md:col-span-4">
              <AreaTexto name="descricao" rows={2} defaultValue={t?.descricao ?? ""} />
            </Campo>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="importante" defaultChecked={t?.importante} /> Marcar como importante
            </label>
            <div className="flex justify-end gap-2 md:col-span-3">
              <BotaoLink variante="secundario" href="/atividades">
                Cancelar
              </BotaoLink>
              <Botao>Salvar</Botao>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {abas.map(([f, r]) => (
          <Link
            key={f}
            href={`/atividades?f=${f}`}
            className={cx("rounded-full px-3 py-1.5 text-sm", filtro === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-1 ring-border hover:bg-muted")}
          >
            {r}
          </Link>
        ))}
        <form className="ml-auto">
          <input type="hidden" name="f" value={filtro} />
          <input name="q" defaultValue={sp.q} placeholder="Buscar tarefa..." className="campo w-56" />
        </form>
      </div>

      {tarefas.length === 0 ? (
        <Vazio>Nenhuma tarefa aqui.</Vazio>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
          {tarefas.map((x) => {
            const atrasada = !x.concluida && x.prazo && x.prazo < hoje;
            const [rotuloPrioridade, corPrioridade] = PRIORIDADES[x.prioridade] ?? PRIORIDADES.NORMAL;
            return (
              <li key={x.id} className="group flex items-center gap-3 px-4 py-3">
                <form action={alternarConclusao}>
                  <input type="hidden" name="id" value={x.id} />
                  <button title={x.concluida ? "Reabrir" : "Concluir"} className={x.concluida ? "text-success" : "text-muted-foreground/50 hover:text-success"}>
                    {x.concluida ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                </form>
                <form action={alternarImportante}>
                  <input type="hidden" name="id" value={x.id} />
                  <button title="Importante" className={x.importante ? "text-amber-500" : "text-muted-foreground/50 hover:text-amber-500"}>
                    <Star size={18} fill={x.importante ? "currentColor" : "none"} />
                  </button>
                </form>
                <div className="min-w-0 flex-1">
                  <Link href={`/atividades?editar=${x.id}&f=${filtro}`} className={cx("block truncate text-sm font-medium hover:underline", x.concluida && "text-muted-foreground line-through")}>
                    {x.titulo}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {x.responsavel?.nome ?? "Sem responsável"}
                    {x.processo && (
                      <>
                        {" · "}
                        <Link href={`/processos/${x.processo.id}`} className="hover:underline">
                          {x.processo.titulo} ({x.processo.cliente.nome})
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <span className="hidden shrink-0 gap-2 sm:flex">
                  <Etiqueta cor="roxo">{TIPOS.find(([v]) => v === x.tipo)?.[1] ?? x.tipo}</Etiqueta>
                  <Etiqueta cor={corPrioridade}>{rotuloPrioridade}</Etiqueta>
                </span>
                <span className={cx("w-20 shrink-0 text-right text-sm sm:w-24", atrasada ? "font-medium text-destructive" : "text-muted-foreground")}>{fmtData(x.prazo)}</span>
                <form action={excluirTarefa} className="opacity-0 group-hover:opacity-100">
                  <input type="hidden" name="id" value={x.id} />
                  <button title="Excluir" className="text-muted-foreground hover:text-destructive">
                    <Trash2 size={16} />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
