import { Briefcase, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { GraficoBarras, GraficoFluxo, GraficoRosca } from "@/components/graficos";
import { Cabecalho, Card, Indicador, Tabela, Td, Vazio } from "@/components/kit";
import { exigirFinanceiro } from "@/lib/acesso";
import { db } from "@/lib/db";
import { brl } from "@/lib/format";

export const metadata = { title: "Relatórios" };

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const STATUS_ROTULO: Record<string, string> = { ATIVO: "Ativos", SUSPENSO: "Suspensos", ENCERRADO: "Encerrados", ARQUIVADO: "Arquivados" };

export default async function Relatorios() {
  const u = await exigirFinanceiro();
  const e = u.escritorioId;
  const agora = new Date();
  const inicio6m = new Date(agora.getFullYear(), agora.getMonth() - 5, 1);
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const [pagos, processos, usuarios, tarefasMes, receitasCategoria] = await Promise.all([
    db.lancamento.findMany({ where: { escritorioId: e, pagamento: { gte: inicio6m }, tipo: { in: ["RECEITA", "DESPESA"] } }, select: { tipo: true, valor: true, pagamento: true } }),
    db.processo.findMany({ where: { escritorioId: e }, select: { area: true, status: true, honorarios: true, valorCausa: true } }),
    db.usuario.findMany({ where: { escritorioId: e, ativo: true }, orderBy: { nome: "asc" } }),
    db.tarefa.findMany({ where: { escritorioId: e, OR: [{ concluidaEm: { gte: inicioMes } }, { concluida: false }] }, select: { responsavelId: true, concluida: true, pontos: true, prazo: true } }),
    db.lancamento.groupBy({ by: ["categoriaId"], where: { escritorioId: e, tipo: "RECEITA", pagamento: { gte: inicio6m } }, _sum: { valor: true } }),
  ]);
  const categorias = await db.categoriaFinanceira.findMany({ where: { escritorioId: e } });

  const meses = Array.from({ length: 6 }, (_, i) => new Date(agora.getFullYear(), agora.getMonth() - 5 + i, 1));
  const fluxo = meses.map((m) => {
    const doMes = pagos.filter((l) => l.pagamento!.getFullYear() === m.getFullYear() && l.pagamento!.getMonth() === m.getMonth());
    const receita = doMes.filter((l) => l.tipo === "RECEITA").reduce((s, l) => s + l.valor, 0);
    const despesa = doMes.filter((l) => l.tipo === "DESPESA").reduce((s, l) => s + l.valor, 0);
    return { rotulo: `${MESES[m.getMonth()]}/${String(m.getFullYear()).slice(2)}`, receita, despesa };
  });

  const contar = <T,>(lista: T[], chave: (x: T) => string) => {
    const m = new Map<string, number>();
    for (const x of lista) m.set(chave(x), (m.get(chave(x)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([rotulo, valor]) => ({ rotulo, valor }));
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const produtividade = usuarios.map((x) => {
    const minhas = tarefasMes.filter((t) => t.responsavelId === x.id);
    const feitas = minhas.filter((t) => t.concluida);
    return {
      nome: x.nome,
      concluidas: feitas.length,
      pontos: feitas.reduce((s, t) => s + t.pontos, 0),
      pendentes: minhas.filter((t) => !t.concluida).length,
      atrasadas: minhas.filter((t) => !t.concluida && t.prazo && t.prazo < hoje).length,
      meta: x.metaPontos,
    };
  });

  const totalReceita = fluxo.reduce((s, f) => s + f.receita, 0);
  const totalDespesa = fluxo.reduce((s, f) => s + f.despesa, 0);
  const carteira = processos.filter((p) => p.status === "ATIVO").reduce((s, p) => s + (p.honorarios ?? 0), 0);

  return (
    <>
      <Cabecalho codigo="REL" titulo="Relatórios" subtitulo="Visão gerencial do escritório" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="Receita (6 meses)" valor={brl(totalReceita)} icone={TrendingUp} tom="sucesso" />
        <Indicador rotulo="Despesa (6 meses)" valor={brl(totalDespesa)} icone={TrendingDown} tom="perigo" />
        <Indicador rotulo="Resultado (6 meses)" valor={brl(totalReceita - totalDespesa)} cor={totalReceita - totalDespesa < 0 ? "text-destructive" : "text-foreground"} icone={Wallet} />
        <Indicador rotulo="Honorários em carteira" valor={brl(carteira)} detalhe="Soma dos honorários de processos ativos" icone={Briefcase} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card titulo="Receitas x despesas realizadas" descricao="Por data de pagamento, últimos 6 meses" className="lg:col-span-2">
          <GraficoFluxo dados={fluxo.map((f) => ({ mes: f.rotulo, receita: f.receita, despesa: f.despesa }))} altura={280} />
        </Card>

        <Card titulo="Receitas por categoria" descricao="Últimos 6 meses">
          {receitasCategoria.length === 0 ? (
            <Vazio>Sem receitas recebidas no período.</Vazio>
          ) : (
            <GraficoBarras
              moeda
              cor="var(--chart-2)"
              dados={receitasCategoria
                .map((r) => ({ rotulo: categorias.find((c) => c.id === r.categoriaId)?.nome ?? "Sem categoria", valor: r._sum.valor ?? 0 }))
                .sort((a, b) => b.valor - a.valor)}
            />
          )}
        </Card>

        <Card titulo="Processos por status">
          {processos.length === 0 ? <Vazio>Nenhum processo.</Vazio> : <GraficoRosca dados={contar(processos, (p) => STATUS_ROTULO[p.status] ?? p.status)} />}
        </Card>

        <Card titulo="Processos por área" className="lg:col-span-2">
          {processos.length === 0 ? <Vazio>Nenhum processo.</Vazio> : <GraficoBarras dados={contar(processos, (p) => p.area ?? "Não informada")} />}
        </Card>
      </div>

      <h2 className="mt-10 mb-4 font-heading text-2xl font-semibold">Desempenho da equipe <span className="font-sans text-sm font-normal text-muted-foreground">· mês atual</span></h2>
      <Tabela colunas={["Usuário", "Concluídas", "Pontos", "Meta", "Pendentes", "Atrasadas"]}>
        {produtividade.map((p) => (
          <tr key={p.nome}>
            <Td className="font-medium">{p.nome}</Td>
            <Td>{p.concluidas}</Td>
            <Td>{p.pontos}</Td>
            <Td>{p.meta ? `${Math.round((p.pontos / p.meta) * 100)}% de ${p.meta}` : "—"}</Td>
            <Td>{p.pendentes}</Td>
            <Td className={p.atrasadas ? "font-medium text-destructive" : ""}>{p.atrasadas}</Td>
          </tr>
        ))}
      </Tabela>
    </>
  );
}
