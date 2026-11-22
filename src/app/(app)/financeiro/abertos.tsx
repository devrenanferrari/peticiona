import { Plus } from "lucide-react";
import { Grade, type Coluna, type Linha, type Tom } from "@/components/grade";
import { BotaoLink, Cabecalho, Indicador } from "@/components/kit";
import { exigirFinanceiro } from "@/lib/acesso";
import { db } from "@/lib/db";
import { brl } from "@/lib/format";
import { parteEscritorio } from "@/lib/rotulos";
import { AbasFinanceiro } from "./abas";

/** Faixa de atraso (aging) de um título em aberto. */
function faixa(dias: number): { texto: string; tom: Tom } {
  if (dias <= 0) return { texto: "A vencer", tom: "verde" };
  if (dias <= 30) return { texto: "Vencido 1–30 dias", tom: "amarelo" };
  if (dias <= 60) return { texto: "Vencido 31–60 dias", tom: "vermelho" };
  if (dias <= 90) return { texto: "Vencido 61–90 dias", tom: "vermelho" };
  return { texto: "Vencido +90 dias", tom: "vermelho" };
}

/** Títulos em aberto (receitas ou despesas), de qualquer data. */
export async function ListaAbertos({ tipo }: { tipo: "RECEITA" | "DESPESA" }) {
  const u = await exigirFinanceiro();
  const receber = tipo === "RECEITA";
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em30 = new Date(hoje.getTime() + 31 * 86400000);

  const [abertos, rpvs] = await Promise.all([
    db.lancamento.findMany({
      where: { escritorioId: u.escritorioId, tipo, pagamento: null },
      include: { categoria: true, cliente: true, conta: true, processo: { select: { titulo: true } }, emprestimo: { select: { descricao: true } } },
      orderBy: { vencimento: "asc" },
    }),
    receber ? db.requisicao.findMany({ where: { escritorioId: u.escritorioId, status: "EXPEDIDA" } }) : [],
  ]);

  const soma = (ls: typeof abertos) => ls.reduce((s, l) => s + l.valor, 0);
  const vencidos = abertos.filter((l) => l.vencimento < hoje);
  const proximos30 = abertos.filter((l) => l.vencimento >= hoje && l.vencimento < em30);
  const rpvTotal = rpvs.reduce((s, r) => s + parteEscritorio(r), 0);

  const colunas: Coluna[] = [
    { chave: "vencimento", rotulo: "Vencimento", tipo: "prazo" },
    { chave: "descricao", rotulo: "Descrição", link: true },
    { chave: "cliente", rotulo: receber ? "Cliente" : "Cliente / referência", oculta: !receber },
    { chave: "processo", rotulo: "Processo", oculta: !receber },
    { chave: "origem", rotulo: "Origem", oculta: receber },
    { chave: "categoria", rotulo: "Categoria" },
    { chave: "conta", rotulo: "Conta" },
    { chave: "faixa", rotulo: "Situação", tipo: "status" },
    { chave: "atraso", rotulo: "Dias de atraso", tipo: "numero", oculta: true },
    { chave: "valor", rotulo: "Valor", tipo: "moeda", total: true },
  ];

  const voltar = receber ? "/financeiro/receber" : "/financeiro/pagar";
  const linhas: Linha[] = abertos.map((l) => {
    const atraso = Math.floor((hoje.getTime() - l.vencimento.getTime()) / 86400000) + 1;
    return {
      id: l.id,
      href: `/financeiro?mes=${l.vencimento.toISOString().slice(0, 7)}&editar=${l.id}&voltar=${encodeURIComponent(voltar)}`,
      vencimento: l.vencimento.toISOString(),
      descricao: l.descricao,
      cliente: l.cliente?.nome,
      processo: l.processo?.titulo,
      origem: l.emprestimo ? `Empréstimo · ${l.emprestimo.descricao}` : "Despesa",
      categoria: l.categoria?.nome,
      conta: l.conta.nome,
      faixa: faixa(atraso),
      atraso: Math.max(0, atraso),
      valor: l.valor,
    };
  });

  return (
    <>
      <Cabecalho
        titulo={receber ? "Contas a receber" : "Contas a pagar"}
        codigo={receber ? "CR" : "CP"}
        subtitulo="Todos os lançamentos em aberto, de qualquer mês. Clique para editar ou dar baixa."
        acoes={
          <BotaoLink href={`/financeiro?novo=${tipo}&voltar=${encodeURIComponent(voltar)}`} variante={receber ? "sucesso" : "perigo"}>
            <Plus size={16} /> {receber ? "Nova receita" : "Nova despesa"}
          </BotaoLink>
        }
        abas={<AbasFinanceiro ativa={voltar} />}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Total em aberto" valor={brl(soma(abertos))} detalhe={`${abertos.length} título(s)`} />
        <Indicador rotulo="Vencido" valor={brl(soma(vencidos))} detalhe={`${vencidos.length} título(s)`} cor={vencidos.length ? "text-destructive" : undefined} />
        <Indicador rotulo="Vence em 30 dias" valor={brl(soma(proximos30))} detalhe={`${proximos30.length} título(s)`} />
        {receber ? (
          <Indicador rotulo="RPV/precatórios expedidos" valor={brl(rpvTotal)} detalhe="Parte do escritório, ainda não paga" cor="text-success" />
        ) : (
          <Indicador rotulo="Parcelas de empréstimos" valor={brl(soma(abertos.filter((l) => l.emprestimoId)))} detalhe="Saldo devedor em aberto" />
        )}
      </div>
      <Grade id={receber ? "receber" : "pagar"} titulo="Títulos em aberto" colunas={colunas} linhas={linhas} vazio="Nada em aberto." />
    </>
  );
}
