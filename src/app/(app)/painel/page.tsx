import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlarmClock, ArrowDownCircle, ArrowUpCircle, Bell, CalendarClock, FileSignature, FolderOpen, Gavel, Landmark, Scale, Target, TrendingUp, Wallet,
} from "lucide-react";
import { Pilula, Prazo } from "@/components/grade";
import { Card } from "@/components/kit";
import { cn } from "@/lib/utils";
import { escopoCarteira, podeFinanceiro } from "@/lib/acesso";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { saldosContas } from "@/lib/financeiro";
import { fmtCNJ, fmtDataHora } from "@/lib/format";
import { INSTANCIAS_RECURSAIS, TIPO_AUDIENCIA, parteEscritorio } from "@/lib/rotulos";

export const metadata = { title: "Launchpad" };

const primeiroNome = (nome: string) => nome.split(" ").find((p) => !/^(dr|dra|sr|sra)\.?$/i.test(p)) ?? nome;
const brlCurto = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const moedaCurta = (v: number) => (Math.abs(v) >= 10000 ? brlCurto.format(v) : v.toLocaleString("pt-BR", { maximumFractionDigits: 0 }));

export default async function Launchpad() {
  const u = await exigirUsuario();
  const e = u.escritorioId;
  const financeiro = podeFinanceiro(u);
  const carteira = await escopoCarteira(u);
  const doUsuario = carteira === "minha" ? { responsavelId: u.id } : {};
  const agora = new Date();
  const hoje = new Date(agora);
  hoje.setHours(0, 0, 0, 0);
  const em7 = new Date(hoje.getTime() + 8 * 86400000);
  const em30 = new Date(hoje.getTime() + 31 * 86400000);
  const em90 = new Date(hoje.getTime() + 91 * 86400000);
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const processoNaCarteira = carteira === "minha" ? { processo: { responsavelId: u.id } } : {};

  const [
    processos, prazosVencidos, prazos7, audiencias7, iniciaisAbertas, iniciaisVencidas, intimacoes, pontosMes, agendaPrazos, agendaAudiencias,
  ] = await Promise.all([
    db.processo.findMany({ where: { escritorioId: e, status: { in: ["ATIVO", "SUSPENSO"] }, ...doUsuario }, select: { instancia: true, sessaoEm: true } }),
    db.tarefa.count({ where: { escritorioId: e, concluida: false, prazo: { lt: hoje }, ...doUsuario } }),
    db.tarefa.count({ where: { escritorioId: e, concluida: false, prazo: { gte: hoje, lt: em7 }, ...doUsuario } }),
    db.audiencia.count({ where: { escritorioId: e, status: "DESIGNADA", data: { gte: hoje, lt: em7 }, ...processoNaCarteira } }),
    db.inicial.count({ where: { escritorioId: e, status: { in: ["A_ELABORAR", "AGUARDANDO_DOCUMENTOS", "EM_ELABORACAO", "REVISAO"] }, ...doUsuario } }),
    db.inicial.count({ where: { escritorioId: e, status: { in: ["A_ELABORAR", "AGUARDANDO_DOCUMENTOS", "EM_ELABORACAO", "REVISAO"] }, prazo: { lt: hoje }, ...doUsuario } }),
    db.intimacao.count({ where: { escritorioId: e, lida: false } }),
    db.tarefa.aggregate({ where: { escritorioId: e, responsavelId: u.id, concluida: true, concluidaEm: { gte: inicioMes } }, _sum: { pontos: true } }),
    db.tarefa.findMany({
      where: { escritorioId: e, concluida: false, prazo: { lt: em7 }, ...doUsuario },
      include: { processo: { select: { id: true, titulo: true, numero: true } } },
      orderBy: { prazo: "asc" },
      take: 12,
    }),
    db.audiencia.findMany({
      where: { escritorioId: e, status: "DESIGNADA", data: { gte: hoje, lt: em7 }, ...processoNaCarteira },
      include: { processo: { select: { id: true, titulo: true, numero: true, vara: true } } },
      orderBy: { data: "asc" },
    }),
  ]);

  const recursais = processos.filter((p) => INSTANCIAS_RECURSAIS.includes(p.instancia ?? ""));
  const pautados = recursais.filter((p) => p.sessaoEm && p.sessaoEm >= hoje).length;

  const fin = financeiro
    ? await (async () => {
        const [contas, abertos, rpvs, parcelasEmp] = await Promise.all([
          saldosContas(e),
          db.lancamento.findMany({ where: { escritorioId: e, pagamento: null, tipo: { in: ["RECEITA", "DESPESA"] }, vencimento: { lt: em90 } }, select: { tipo: true, valor: true, vencimento: true } }),
          db.requisicao.findMany({ where: { escritorioId: e, status: "EXPEDIDA" } }),
          db.lancamento.aggregate({ where: { escritorioId: e, emprestimoId: { not: null }, pagamento: null }, _sum: { valor: true } }),
        ]);
        const soma = (f: (l: (typeof abertos)[number]) => boolean) => abertos.filter(f).reduce((s, l) => s + l.valor, 0);
        const saldo = contas.reduce((s, c) => s + c.saldo, 0);
        const rpv = rpvs.reduce((s, r) => s + parteEscritorio(r), 0);
        const rpv90 = rpvs.filter((r) => !r.previsao || r.previsao < em90).reduce((s, r) => s + parteEscritorio(r), 0);
        return {
          saldo,
          receberVencido: soma((l) => l.tipo === "RECEITA" && l.vencimento < hoje),
          receber30: soma((l) => l.tipo === "RECEITA" && l.vencimento >= hoje && l.vencimento < em30),
          pagar30: soma((l) => l.tipo === "DESPESA" && l.vencimento < em30),
          projetado90: saldo + rpv90 + soma((l) => l.tipo === "RECEITA") - soma((l) => l.tipo === "DESPESA"),
          emprestimos: parcelasEmp._sum.valor ?? 0,
          rpv,
          rpvQtd: rpvs.length,
        };
      })()
    : null;

  // Agenda da semana: prazos e audiências juntos, por data.
  const agenda = [
    ...agendaPrazos.map((t) => ({ id: t.id, data: t.prazo!, tipo: "prazo" as const, titulo: t.titulo, processo: t.processo })),
    ...agendaAudiencias.map((a) => ({ id: a.id, data: a.data, tipo: "audiencia" as const, titulo: `Audiência de ${TIPO_AUDIENCIA[a.tipo]?.toLowerCase()}${a.processo.vara ? ` · ${a.processo.vara}` : ""}`, processo: a.processo })),
  ].sort((a, b) => a.data.getTime() - b.data.getTime());

  const saudacao = agora.getHours() < 12 ? "Bom dia" : agora.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const pontos = pontosMes._sum.pontos ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 data-titulo-pagina className="titulo-grande">
            {saudacao}, {primeiroNome(u.nome)}
          </h1>
          <p className="text-[0.8125rem] text-muted-foreground first-letter:uppercase">
            {agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" })} ·{" "}
            {carteira === "minha" ? "minha carteira" : "carteira do escritório"}
          </p>
        </div>
      </div>

      <Grupo titulo="Jurídico">
        <Bloco href="/atividades" titulo="Prazos vencidos" sub="em aberto" icone={AlarmClock} valor={prazosVencidos} tom={prazosVencidos ? "vermelho" : "verde"} codigo="TAR" />
        <Bloco href="/atividades" titulo="Prazos da semana" sub="próximos 7 dias" icone={CalendarClock} valor={prazos7} tom={prazos7 ? "amarelo" : undefined} codigo="TAR" />
        <Bloco href="/audiencias" titulo="Audiências" sub="próximos 7 dias" icone={Gavel} valor={audiencias7} codigo="AUD" />
        <Bloco href="/iniciais" titulo="Iniciais a protocolar" sub={iniciaisVencidas ? `${iniciaisVencidas} com prazo vencido` : "em andamento"} icone={FileSignature} valor={iniciaisAbertas} tom={iniciaisVencidas ? "vermelho" : undefined} codigo="INI" />
        <Bloco href="/processos" titulo="1ª instância" sub="processos ativos" icone={FolderOpen} valor={processos.length - recursais.length} codigo="PR1" />
        <Bloco href="/processos?aba=2" titulo="2ª instância e tribunais" sub={`${pautados} com sessão marcada`} icone={Scale} valor={recursais.length} codigo="PR2" />
        <Bloco href="/intimacoes" titulo="Intimações" sub="não lidas" icone={Bell} valor={intimacoes} tom={intimacoes ? "amarelo" : undefined} codigo="INT" />
        {u.metaPontos > 0 && (
          <Bloco href="/atividades" titulo="Minha meta do mês" sub={`${pontos} de ${u.metaPontos} pontos`} icone={Target} valor={`${Math.min(100, Math.round((pontos / u.metaPontos) * 100))}`} unidade="%" codigo="TAR" />
        )}
      </Grupo>

      {fin && (
        <Grupo titulo="Financeiro">
          <Bloco href="/financeiro" titulo="Saldo em contas" sub="realizado" icone={Wallet} valor={moedaCurta(fin.saldo)} unidade="R$" tom={fin.saldo < 0 ? "vermelho" : undefined} codigo="FIN" />
          <Bloco href="/financeiro/receber" titulo="A receber vencido" sub={`+ ${moedaCurta(fin.receber30)} vencem em 30 dias`} icone={ArrowDownCircle} valor={moedaCurta(fin.receberVencido)} unidade="R$" tom={fin.receberVencido ? "vermelho" : "verde"} codigo="CR" />
          <Bloco href="/financeiro/pagar" titulo="A pagar" sub="vencidos e próximos 30 dias" icone={ArrowUpCircle} valor={moedaCurta(fin.pagar30)} unidade="R$" codigo="CP" />
          <Bloco href="/financeiro/fluxo" titulo="Saldo projetado" sub="daqui a 90 dias" icone={TrendingUp} valor={moedaCurta(fin.projetado90)} unidade="R$" tom={fin.projetado90 < 0 ? "vermelho" : "verde"} codigo="FLX" />
          <Bloco href="/financeiro/emprestimos" titulo="Empréstimos" sub="saldo devedor" icone={Landmark} valor={moedaCurta(fin.emprestimos)} unidade="R$" codigo="EMP" />
          <Bloco href="/financeiro/rpv" titulo="RPV e precatórios" sub={`${fin.rpvQtd} expedida(s), parte do escritório`} icone={Scale} valor={moedaCurta(fin.rpv)} unidade="R$" tom="verde" codigo="RPV" />
        </Grupo>
      )}

      <Card titulo="Agenda dos próximos 7 dias" descricao="Prazos (inclusive vencidos) e audiências da carteira">
        {agenda.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nada na agenda da semana.</p>
        ) : (
          <ul className="divide-y text-[0.8125rem]">
            {agenda.map((a) => (
              <li key={a.tipo + a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="w-44 shrink-0">{a.tipo === "prazo" ? <Prazo iso={a.data.toISOString()} /> : <span className="tabular">{fmtDataHora(a.data)}</span>}</span>
                <Pilula tom={a.tipo === "prazo" ? "amarelo" : "roxo"}>{a.tipo === "prazo" ? "Prazo" : "Audiência"}</Pilula>
                <span className="min-w-0 flex-1 truncate font-medium">{a.titulo}</span>
                {a.processo && (
                  <Link href={`/processos/${a.processo.id}`} className="truncate font-mono text-xs text-marca hover:underline">
                    {fmtCNJ(a.processo.numero) || a.processo.titulo}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[0.8125rem] font-semibold tracking-wide text-muted-foreground uppercase">{titulo}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{children}</div>
    </section>
  );
}

const CORES = { vermelho: "text-destructive", amarelo: "text-[oklch(0.62_0.15_60)] dark:text-warning", verde: "text-success" };

/** Bloco do launchpad: título, subtítulo, número grande e código da transação. */
function Bloco({
  href, titulo, sub, icone: Icone, valor, unidade, tom, codigo,
}: { href: string; titulo: string; sub: string; icone: LucideIcon; valor: number | string; unidade?: string; tom?: keyof typeof CORES; codigo: string }) {
  return (
    <Link
      href={href}
      className="group flex aspect-[1.15] min-h-36 flex-col rounded-md border bg-card p-3.5 shadow-(--sombra-cartao) transition-[box-shadow,border-color] hover:border-marca/50 hover:shadow-(--sombra-flutuante)"
    >
      <p className="text-[0.875rem] leading-snug font-semibold">{titulo}</p>
      <p className="mt-0.5 line-clamp-2 text-[0.75rem] text-muted-foreground">{sub}</p>
      <div className="mt-auto flex items-end justify-between gap-2">
        <Icone className="mb-1 size-5 shrink-0 text-muted-foreground/60 group-hover:text-marca" strokeWidth={1.75} />
        <p className={cn("tabular text-right leading-none font-light tracking-tight", unidade === "R$" ? "text-[1.5rem]" : "text-[1.875rem]", tom ? CORES[tom] : "text-marca")}>
          {unidade === "R$" && <span className="mr-1 text-[0.75rem] font-normal text-muted-foreground">R$</span>}
          {valor}
          {unidade && unidade !== "R$" && <span className="ml-0.5 text-[0.8125rem] font-normal text-muted-foreground">{unidade}</span>}
        </p>
      </div>
      <p className="mt-2 font-mono text-[0.625rem] text-muted-foreground/60">{codigo}</p>
    </Link>
  );
}
