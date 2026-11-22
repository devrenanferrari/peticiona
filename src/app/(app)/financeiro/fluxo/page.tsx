import { GraficoColunas } from "@/components/graficos";
import { Grade, type Coluna, type Linha } from "@/components/grade";
import { Cabecalho, Card, Indicador } from "@/components/kit";
import { exigirFinanceiro } from "@/lib/acesso";
import { db } from "@/lib/db";
import { saldosContas } from "@/lib/financeiro";
import { brl } from "@/lib/format";
import { parteEscritorio } from "@/lib/rotulos";
import { AbasFinanceiro } from "../abas";

export const metadata = { title: "Fluxo de caixa projetado" };

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const HORIZONTE = 12;

const COLUNAS: Coluna[] = [
  { chave: "mes", rotulo: "Mês" },
  { chave: "entradas", rotulo: "Recebimentos previstos", tipo: "moeda", total: true },
  { chave: "rpv", rotulo: "RPV / precatórios", tipo: "moeda", total: true },
  { chave: "saidas", rotulo: "Despesas previstas", tipo: "moeda", total: true },
  { chave: "emprestimos", rotulo: "Parcelas de empréstimos", tipo: "moeda", total: true },
  { chave: "resultado", rotulo: "Resultado do mês", tipo: "moeda", total: true },
  { chave: "saldo", rotulo: "Saldo projetado", tipo: "moeda" },
];

export default async function Fluxo() {
  const u = await exigirFinanceiro();
  const e = u.escritorioId;
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fim = new Date(agora.getFullYear(), agora.getMonth() + HORIZONTE, 1);

  const [contas, abertos, requisicoes] = await Promise.all([
    saldosContas(e),
    db.lancamento.findMany({
      where: { escritorioId: e, pagamento: null, tipo: { in: ["RECEITA", "DESPESA"] }, vencimento: { lt: fim } },
      select: { tipo: true, valor: true, vencimento: true, emprestimoId: true },
    }),
    db.requisicao.findMany({ where: { escritorioId: e, status: "EXPEDIDA", previsao: { lt: fim } } }),
  ]);

  const saldoAtual = contas.reduce((s, c) => s + c.saldo, 0);

  // Títulos vencidos e ainda abertos entram numa linha própria, antes do mês corrente.
  type Mes = { mes: string; entradas: number; rpv: number; saidas: number; emprestimos: number };
  const vencidos: Mes = { mes: "Vencidos em aberto", entradas: 0, rpv: 0, saidas: 0, emprestimos: 0 };
  const meses: Mes[] = Array.from({ length: HORIZONTE }, (_, i) => {
    const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
    return { mes: `${MESES[d.getMonth()]}/${d.getFullYear()}`, entradas: 0, rpv: 0, saidas: 0, emprestimos: 0 };
  });
  const indice = (d: Date) => (d.getFullYear() - agora.getFullYear()) * 12 + d.getMonth() - agora.getMonth();
  const hoje = new Date(agora);
  hoje.setHours(0, 0, 0, 0);

  for (const l of abertos) {
    const alvo = l.vencimento < hoje ? vencidos : meses[indice(l.vencimento)];
    if (!alvo) continue;
    if (l.tipo === "RECEITA") alvo.entradas += l.valor;
    else if (l.emprestimoId) alvo.emprestimos += l.valor;
    else alvo.saidas += l.valor;
  }
  for (const r of requisicoes) {
    // Sem previsão ou com previsão já passada: conta no mês corrente.
    const alvo = !r.previsao || r.previsao < inicioMes ? meses[0] : meses[indice(r.previsao)];
    if (alvo) alvo.rpv += parteEscritorio(r);
  }

  let saldo = saldoAtual;
  const linhas: Linha[] = [vencidos, ...meses].map((m, i) => {
    const resultado = m.entradas + m.rpv - m.saidas - m.emprestimos;
    saldo += resultado;
    return { id: String(i), ...m, resultado, saldo };
  });
  const negativo = linhas.slice(1).find((l) => Number(l.saldo) < 0);
  const totalEntradas = meses.reduce((s, m) => s + m.entradas + m.rpv, 0) + vencidos.entradas;
  const totalSaidas = meses.reduce((s, m) => s + m.saidas + m.emprestimos, 0) + vencidos.saidas + vencidos.emprestimos;

  return (
    <>
      <Cabecalho
        titulo="Fluxo de caixa projetado"
        codigo="FLX"
        subtitulo={`Próximos ${HORIZONTE} meses, a partir do saldo atual das contas e de tudo que está lançado em aberto.`}
        abas={<AbasFinanceiro ativa="/financeiro/fluxo" />}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Saldo atual em contas" valor={brl(saldoAtual)} cor={saldoAtual < 0 ? "text-destructive" : undefined} />
        <Indicador rotulo={`Entradas previstas (${HORIZONTE} meses)`} valor={brl(totalEntradas)} cor="text-success" detalhe="Inclui RPVs e precatórios expedidos" />
        <Indicador rotulo={`Saídas previstas (${HORIZONTE} meses)`} valor={brl(totalSaidas)} cor="text-destructive" detalhe="Inclui parcelas de empréstimos" />
        <Indicador
          rotulo="Saldo ao fim do período"
          valor={brl(saldo)}
          cor={saldo < 0 ? "text-destructive" : "text-success"}
          detalhe={negativo ? `Saldo negativo a partir de ${negativo.mes}` : "Sem saldo negativo no período"}
        />
      </div>
      <Card titulo="Entradas x saídas por mês" className="mb-4">
        <GraficoColunas altura={220} dados={meses.map((m) => ({ mes: m.mes, receita: m.entradas + m.rpv, despesa: m.saidas + m.emprestimos }))} />
      </Card>
      <Grade id="fluxo" titulo="Projeção mensal" colunas={COLUNAS} linhas={linhas} rodape="O saldo projetado acumula o resultado de cada mês sobre o saldo atual. RPVs sem previsão de pagamento entram no mês corrente." />
    </>
  );
}
