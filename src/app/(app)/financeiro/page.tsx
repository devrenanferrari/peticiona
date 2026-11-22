import Link from "next/link";
import { ArrowLeftRight, Check, ChevronLeft, ChevronRight, Minus, Plus, Trash2 } from "lucide-react";
import { AreaTexto, Botao, BotaoLink, Cabecalho, Campo, Card, Entrada, Indicador, Selecao, Tabela, Td, Vazio, cx } from "@/components/kit";
import { exigirFinanceiro } from "@/lib/acesso";
import { db } from "@/lib/db";
import { intervaloMes, saldosContas } from "@/lib/financeiro";
import { brl, fmtData, inputData } from "@/lib/format";
import { AbasFinanceiro } from "./abas";
import { alternarPagamento, excluirLancamento, salvarConta, salvarLancamento } from "./actions";

export const metadata = { title: "Financeiro" };

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const param = (a: number, m: number) => {
  const d = new Date(a, m - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default async function Financeiro({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; novo?: string; editar?: string; conta?: string; processo?: string; status?: string; voltar?: string }>;
}) {
  const sp = await searchParams;
  const u = await exigirFinanceiro();
  const e = u.escritorioId;
  const { inicio, fim, ano, mes } = intervaloMes(sp.mes);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [contas, lancamentos, atrasados, categorias, clientes, processos, editando, processoPre] = await Promise.all([
    saldosContas(e),
    db.lancamento.findMany({
      where: {
        escritorioId: e,
        vencimento: { gte: inicio, lt: fim },
        ...(sp.conta ? { OR: [{ contaId: sp.conta }, { contaDestinoId: sp.conta }] } : {}),
        ...(sp.status === "abertos" ? { pagamento: null } : sp.status === "pagos" ? { pagamento: { not: null } } : {}),
      },
      include: { categoria: true, cliente: true, conta: true, contaDestino: true },
      orderBy: { vencimento: "asc" },
    }),
    db.lancamento.aggregate({ where: { escritorioId: e, tipo: "DESPESA", pagamento: null, vencimento: { lt: hoje } }, _sum: { valor: true } }),
    db.categoriaFinanceira.findMany({ where: { escritorioId: e }, orderBy: { nome: "asc" } }),
    db.cliente.findMany({ where: { escritorioId: e }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    db.processo.findMany({ where: { escritorioId: e }, orderBy: { titulo: "asc" }, include: { cliente: true } }),
    sp.editar ? db.lancamento.findFirst({ where: { id: sp.editar, escritorioId: e } }) : null,
    sp.processo ? db.processo.findFirst({ where: { id: sp.processo, escritorioId: e } }) : null,
  ]);

  const soma = (f: (l: (typeof lancamentos)[number]) => boolean) => lancamentos.filter(f).reduce((s, l) => s + l.valor, 0);
  const receitaPrevista = soma((l) => l.tipo === "RECEITA");
  const receitaRealizada = soma((l) => l.tipo === "RECEITA" && !!l.pagamento);
  const despesaPrevista = soma((l) => l.tipo === "DESPESA");
  const despesaRealizada = soma((l) => l.tipo === "DESPESA" && !!l.pagamento);
  const saldoTotal = contas.reduce((s, c) => s + c.saldo, 0);
  const aReceberAtrasado = soma((l) => l.tipo === "RECEITA" && !l.pagamento && l.vencimento < hoje);

  const l = editando;
  const tipoForm = l?.tipo ?? (sp.novo && ["RECEITA", "DESPESA", "TRANSFERENCIA"].includes(sp.novo) ? sp.novo : null);
  const mesAtual = param(ano, mes);

  return (
    <>
      <Cabecalho
        titulo="Lançamentos"
        codigo="FIN"
        abas={<AbasFinanceiro ativa="/financeiro" />}
        acoes={
          <>
            <BotaoLink href={`/financeiro?mes=${mesAtual}&novo=RECEITA`} className="bg-success text-success-foreground hover:bg-success/90">
              <Plus size={16} /> Receita
            </BotaoLink>
            <BotaoLink href={`/financeiro?mes=${mesAtual}&novo=DESPESA`} variante="perigo">
              <Minus size={16} /> Despesa
            </BotaoLink>
            <BotaoLink href={`/financeiro?mes=${mesAtual}&novo=TRANSFERENCIA`} variante="secundario">
              <ArrowLeftRight size={16} /> Transferência
            </BotaoLink>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Saldo em contas" valor={brl(saldoTotal)} cor={saldoTotal < 0 ? "text-destructive" : "text-foreground"} />
        <Indicador rotulo="Receita do mês" valor={brl(receitaPrevista)} detalhe={`Realizada: ${brl(receitaRealizada)}`} cor="text-success" />
        <Indicador rotulo="Despesa do mês" valor={brl(despesaPrevista)} detalhe={`Realizada: ${brl(despesaRealizada)}`} cor="text-destructive" />
        <Indicador
          rotulo="Atrasados"
          valor={brl(atrasados._sum.valor ?? 0)}
          detalhe={`Despesas vencidas · a receber vencido no mês: ${brl(aReceberAtrasado)}`}
          cor="text-amber-600 dark:text-warning"
        />
      </div>

      {tipoForm && (
        <Card titulo={`${l ? "Editar" : "Nova"} ${tipoForm === "RECEITA" ? "receita" : tipoForm === "DESPESA" ? "despesa" : "transferência"}`} className="mb-6">
          <form action={salvarLancamento} className="grid gap-4 md:grid-cols-4">
            {l && <input type="hidden" name="id" value={l.id} />}
            {sp.voltar?.startsWith("/") && <input type="hidden" name="voltar" value={sp.voltar} />}
            <input type="hidden" name="tipo" value={tipoForm} />
            <Campo rotulo="Descrição *" className="md:col-span-2">
              <Entrada name="descricao" required autoFocus defaultValue={l?.descricao ?? (processoPre ? `Honorários – ${processoPre.titulo}` : "")} />
            </Campo>
            <Campo rotulo="Valor (R$) *">
              <Entrada name="valor" required inputMode="decimal" defaultValue={l?.valor ?? ""} />
            </Campo>
            <Campo rotulo="Vencimento *">
              <Entrada type="date" name="vencimento" required defaultValue={inputData(l?.vencimento ?? new Date())} />
            </Campo>
            <Campo rotulo={tipoForm === "TRANSFERENCIA" ? "Conta de origem *" : "Conta *"}>
              <Selecao name="contaId" required defaultValue={l?.contaId ?? contas[0]?.id} opcoes={contas.map((c) => [c.id, c.nome])} />
            </Campo>
            {tipoForm === "TRANSFERENCIA" ? (
              <Campo rotulo="Conta de destino *">
                <Selecao name="contaDestinoId" required defaultValue={l?.contaDestinoId ?? contas[1]?.id} opcoes={contas.map((c) => [c.id, c.nome])} />
              </Campo>
            ) : (
              <>
                <Campo rotulo="Categoria">
                  <Selecao name="categoriaId" defaultValue={l?.categoriaId ?? ""} vazio="—" opcoes={categorias.filter((c) => c.tipo === tipoForm).map((c) => [c.id, c.nome])} />
                </Campo>
                <Campo rotulo="Cliente">
                  <Selecao name="clienteId" defaultValue={l?.clienteId ?? processoPre?.clienteId ?? ""} vazio="—" opcoes={clientes.map((c) => [c.id, c.nome])} />
                </Campo>
                <Campo rotulo="Processo">
                  <Selecao name="processoId" defaultValue={l?.processoId ?? sp.processo ?? ""} vazio="—" opcoes={processos.map((p) => [p.id, `${p.titulo} (${p.cliente.nome})`])} />
                </Campo>
              </>
            )}
            <Campo rotulo="Competência">
              <Entrada type="date" name="competencia" defaultValue={inputData(l?.competencia)} />
            </Campo>
            {!l && (
              <Campo rotulo="Parcelas" dica="Cria um lançamento por mês">
                <Entrada type="number" name="parcelas" min={1} max={120} defaultValue={1} />
              </Campo>
            )}
            <Campo rotulo="Data do pagamento">
              <Entrada type="date" name="pagamento" defaultValue={inputData(l?.pagamento)} />
            </Campo>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" name="pago" defaultChecked={!!l?.pagamento} /> Já foi pago/recebido
            </label>
            <Campo rotulo="Observações" className="md:col-span-4">
              <AreaTexto name="observacoes" rows={2} defaultValue={l?.observacoes ?? ""} />
            </Campo>
            <div className="flex justify-end gap-2 md:col-span-4">
              <BotaoLink variante="secundario" href={sp.voltar?.startsWith("/") ? sp.voltar : `/financeiro?mes=${mesAtual}`}>
                Cancelar
              </BotaoLink>
              <Botao>Salvar</Botao>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="space-y-6">
          <Card titulo="Contas bancárias">
            <ul className="space-y-1 text-sm">
              <li>
                <Link href={`/financeiro?mes=${mesAtual}`} className={cx("flex justify-between rounded-lg px-2 py-1.5 hover:bg-muted", !sp.conta && "bg-accent font-medium")}>
                  <span>Todas</span>
                  <span>{brl(saldoTotal)}</span>
                </Link>
              </li>
              {contas.map((c) => (
                <li key={c.id}>
                  <Link href={`/financeiro?mes=${mesAtual}&conta=${c.id}`} className={cx("flex justify-between rounded-lg px-2 py-1.5 hover:bg-muted", sp.conta === c.id && "bg-accent font-medium")}>
                    <span>{c.nome}</span>
                    <span className={c.saldo < 0 ? "text-destructive" : ""}>{brl(c.saldo)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <form action={salvarConta} className="mt-4 space-y-2 border-t border-border pt-4">
              <Entrada name="nome" required placeholder="Nova conta" />
              <Entrada name="saldoInicial" inputMode="decimal" placeholder="Saldo inicial (R$)" />
              <Botao variante="secundario" className="w-full">
                Adicionar conta
              </Botao>
            </form>
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Link href={`/financeiro?mes=${param(ano, mes - 1)}${sp.conta ? `&conta=${sp.conta}` : ""}`} className="rounded-lg p-1.5 hover:bg-card">
              <ChevronLeft />
            </Link>
            <h2 className="w-44 text-center font-semibold">
              {MESES[mes - 1]} {ano}
            </h2>
            <Link href={`/financeiro?mes=${param(ano, mes + 1)}${sp.conta ? `&conta=${sp.conta}` : ""}`} className="rounded-lg p-1.5 hover:bg-card">
              <ChevronRight />
            </Link>
            <div className="ml-auto flex gap-1 text-sm">
              {[["", "Todos"], ["abertos", "Em aberto"], ["pagos", "Pagos"]].map(([v, r]) => (
                <Link
                  key={v}
                  href={`/financeiro?mes=${mesAtual}${sp.conta ? `&conta=${sp.conta}` : ""}${v ? `&status=${v}` : ""}`}
                  className={cx("rounded-full px-3 py-1", (sp.status ?? "") === v ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-border")}
                >
                  {r}
                </Link>
              ))}
            </div>
          </div>

          {lancamentos.length === 0 ? (
            <Vazio>Nenhum lançamento neste mês.</Vazio>
          ) : (
            <Tabela colunas={["", "Vencimento", "Lançamento", "Categoria", "Conta", "Valor", ""]}>
              {lancamentos.map((x) => {
                const vencido = !x.pagamento && x.vencimento < hoje;
                const sinal = x.tipo === "RECEITA" ? "text-success" : x.tipo === "DESPESA" ? "text-destructive" : "text-muted-foreground";
                return (
                  <tr key={x.id} className="group hover:bg-muted">
                    <Td className="w-10">
                      <form action={alternarPagamento}>
                        <input type="hidden" name="id" value={x.id} />
                        <button
                          title={x.pagamento ? `Pago em ${fmtData(x.pagamento)} — clique para reabrir` : "Marcar como pago"}
                          className={cx("flex h-5 w-5 items-center justify-center rounded border", x.pagamento ? "border-success bg-success text-white" : "border-border hover:border-success")}
                        >
                          {x.pagamento && <Check size={12} />}
                        </button>
                      </form>
                    </Td>
                    <Td className={cx("whitespace-nowrap", vencido ? "font-medium text-destructive" : "text-muted-foreground")}>{fmtData(x.vencimento)}</Td>
                    <Td>
                      <Link href={`/financeiro?mes=${mesAtual}&editar=${x.id}`} className="hover:underline">
                        {x.descricao}
                      </Link>
                      {x.cliente && <p className="text-xs text-muted-foreground">{x.cliente.nome}</p>}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{x.tipo === "TRANSFERENCIA" ? "Transferência" : x.categoria?.nome ?? "—"}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{x.tipo === "TRANSFERENCIA" ? `${x.conta.nome} → ${x.contaDestino?.nome}` : x.conta.nome}</Td>
                    <Td className={cx("whitespace-nowrap text-right font-medium", sinal)}>
                      {x.tipo === "DESPESA" ? "−" : ""}
                      {brl(x.valor)}
                    </Td>
                    <Td className="w-8">
                      <form action={excluirLancamento} className="opacity-0 group-hover:opacity-100">
                        <input type="hidden" name="id" value={x.id} />
                        <button title="Excluir" className="text-muted-foreground hover:text-destructive">
                          <Trash2 size={15} />
                        </button>
                      </form>
                    </Td>
                  </tr>
                );
              })}
              <tr className="bg-muted/50 font-medium">
                <Td colSpan={5} className="text-right text-muted-foreground">
                  Resultado previsto do período
                </Td>
                <Td className={cx("text-right", receitaPrevista - despesaPrevista < 0 ? "text-destructive" : "text-success")}>{brl(receitaPrevista - despesaPrevista)}</Td>
                <Td />
              </tr>
            </Tabela>
          )}
        </div>
      </div>
    </>
  );
}
