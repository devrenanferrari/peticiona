import { Check, Plus, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Grade, Pilula, Prazo, type Coluna, type Linha } from "@/components/grade";
import { AreaTexto, Atributos, Botao, BotaoLink, Cabecalho, Campo, Card, Entrada, Indicador, Selecao, Tabela, Td, cx } from "@/components/kit";
import { Progress } from "@/components/ui/progress";
import { exigirFinanceiro } from "@/lib/acesso";
import { db } from "@/lib/db";
import { brl, fmtData, inputData } from "@/lib/format";
import { alternarPagamento } from "../actions";
import { AbasFinanceiro } from "../abas";
import { excluirEmprestimo, quitarEmprestimo, salvarEmprestimo } from "./actions";

export const metadata = { title: "Empréstimos" };

const COLUNAS: Coluna[] = [
  { chave: "descricao", rotulo: "Empréstimo", link: true },
  { chave: "credor", rotulo: "Credor" },
  { chave: "valor", rotulo: "Valor contratado", tipo: "moeda", total: true },
  { chave: "taxa", rotulo: "Taxa a.m.", tipo: "percentual", oculta: true },
  { chave: "valorParcela", rotulo: "Parcela", tipo: "moeda" },
  { chave: "pagas", rotulo: "Parcelas pagas" },
  { chave: "proxima", rotulo: "Próximo vencimento", tipo: "prazo" },
  { chave: "pago", rotulo: "Já pago", tipo: "moeda", total: true, oculta: true },
  { chave: "saldo", rotulo: "Saldo devedor", tipo: "moeda", total: true },
  { chave: "conta", rotulo: "Conta de débito", oculta: true },
  { chave: "situacao", rotulo: "Situação", tipo: "status" },
];

export default async function Emprestimos({ searchParams }: { searchParams: Promise<{ novo?: string; ver?: string; editar?: string }> }) {
  const sp = await searchParams;
  const u = await exigirFinanceiro();
  const e = u.escritorioId;

  const [emprestimos, contas, categorias] = await Promise.all([
    db.emprestimo.findMany({
      where: { escritorioId: e },
      include: { conta: true, categoria: true, lancamentos: { orderBy: { vencimento: "asc" } } },
      orderBy: { criadoEm: "desc" },
    }),
    db.contaBancaria.findMany({ where: { escritorioId: e }, orderBy: { nome: "asc" } }),
    db.categoriaFinanceira.findMany({ where: { escritorioId: e, tipo: "DESPESA" }, orderBy: { nome: "asc" } }),
  ]);

  const resumo = (emp: (typeof emprestimos)[number]) => {
    const abertas = emp.lancamentos.filter((l) => !l.pagamento);
    return {
      pagas: emp.lancamentos.length - abertas.length,
      saldo: abertas.reduce((s, l) => s + l.valor, 0),
      pago: emp.lancamentos.filter((l) => l.pagamento).reduce((s, l) => s + l.valor, 0),
      proxima: abertas[0],
    };
  };

  const linhas: Linha[] = emprestimos.map((emp) => {
    const r = resumo(emp);
    return {
      id: emp.id,
      href: `/financeiro/emprestimos?ver=${emp.id}`,
      descricao: emp.descricao,
      credor: emp.credor,
      valor: emp.valor,
      taxa: emp.taxaMensal,
      valorParcela: emp.valorParcela,
      pagas: `${r.pagas} / ${emp.lancamentos.length}`,
      proxima: r.proxima?.vencimento.toISOString(),
      pago: r.pago,
      saldo: r.saldo,
      conta: emp.conta.nome,
      situacao: r.saldo === 0 ? { texto: "Quitado", tom: "verde" } : r.proxima && r.proxima.vencimento < new Date() ? { texto: "Parcela vencida", tom: "vermelho" } : { texto: "Em dia", tom: "azul" },
    };
  });

  const ver = sp.ver ? emprestimos.find((x) => x.id === sp.ver) : null;
  if (sp.ver && !ver) notFound();
  const totalSaldo = emprestimos.reduce((s, x) => s + resumo(x).saldo, 0);
  const totalMes = emprestimos.reduce((s, x) => {
    const agora = new Date();
    return s + x.lancamentos.filter((l) => l.vencimento.getMonth() === agora.getMonth() && l.vencimento.getFullYear() === agora.getFullYear()).reduce((a, l) => a + l.valor, 0);
  }, 0);

  return (
    <>
      <Cabecalho
        titulo={ver ? ver.descricao : "Empréstimos"}
        codigo="EMP"
        subtitulo={ver ? `${ver.credor ?? "Credor não informado"} · contratado em ${fmtData(ver.criadoEm)}` : "Cada empréstimo gera suas parcelas no contas a pagar e no fluxo projetado."}
        acoes={
          ver ? (
            <BotaoLink variante="secundario" href="/financeiro/emprestimos">
              Voltar à lista
            </BotaoLink>
          ) : (
            <BotaoLink href="/financeiro/emprestimos?novo=1">
              <Plus size={16} /> Novo empréstimo
            </BotaoLink>
          )
        }
        abas={<AbasFinanceiro ativa="/financeiro/emprestimos" />}
      />

      {sp.novo && (
        <Card titulo="Novo empréstimo" className="mb-4">
          <form action={salvarEmprestimo} className="grid gap-3 md:grid-cols-4">
            <Campo rotulo="Descrição *" className="md:col-span-2">
              <Entrada name="descricao" required autoFocus placeholder="Ex.: Capital de giro Banco X" />
            </Campo>
            <Campo rotulo="Credor">
              <Entrada name="credor" placeholder="Banco, sócio, terceiro" />
            </Campo>
            <Campo rotulo="Valor contratado (R$) *">
              <Entrada name="valor" required inputMode="decimal" />
            </Campo>
            <Campo rotulo="Nº de parcelas *">
              <Entrada name="parcelas" type="number" min={1} max={420} required defaultValue={12} />
            </Campo>
            <Campo rotulo="Taxa ao mês (%)" dica="Usada para calcular a parcela (Price)">
              <Entrada name="taxaMensal" inputMode="decimal" />
            </Campo>
            <Campo rotulo="Valor da parcela (R$)" dica="Se o contrato já informa, preencha; senão é calculado">
              <Entrada name="valorParcela" inputMode="decimal" />
            </Campo>
            <Campo rotulo="1º vencimento *">
              <Entrada type="date" name="primeiroVencimento" required />
            </Campo>
            <Campo rotulo="Conta de débito *">
              <Selecao name="contaId" required defaultValue={contas[0]?.id} opcoes={contas.map((c) => [c.id, c.nome])} />
            </Campo>
            <Campo rotulo="Categoria">
              <Selecao name="categoriaId" vazio="—" defaultValue={categorias.find((c) => /empr|financ|juro/i.test(c.nome))?.id ?? ""} opcoes={categorias.map((c) => [c.id, c.nome])} />
            </Campo>
            <label className="flex items-end gap-2 pb-2 text-[0.8125rem] md:col-span-1">
              <input type="checkbox" name="lancarEntrada" /> Lançar a entrada do dinheiro na conta
            </label>
            <Campo rotulo="Data da entrada">
              <Entrada type="date" name="dataEntrada" defaultValue={inputData(new Date())} />
            </Campo>
            <Campo rotulo="Observações" className="md:col-span-4">
              <AreaTexto name="observacoes" rows={2} />
            </Campo>
            <div className="flex justify-end gap-2 md:col-span-4">
              <BotaoLink variante="secundario" href="/financeiro/emprestimos">
                Cancelar
              </BotaoLink>
              <Botao>Gerar parcelas</Botao>
            </div>
          </form>
        </Card>
      )}

      {ver ? (
        <Detalhe emp={ver} r={resumo(ver)} editar={!!sp.editar} />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Indicador rotulo="Saldo devedor total" valor={brl(totalSaldo)} cor={totalSaldo > 0 ? "text-destructive" : undefined} />
            <Indicador rotulo="Parcelas deste mês" valor={brl(totalMes)} />
            <Indicador rotulo="Empréstimos ativos" valor={emprestimos.filter((x) => resumo(x).saldo > 0).length} detalhe={`${emprestimos.length} cadastrado(s)`} />
          </div>
          <Grade id="emprestimos" titulo="Empréstimos" colunas={COLUNAS} linhas={linhas} vazio="Nenhum empréstimo cadastrado." />
        </>
      )}
    </>
  );
}

type Emp = Prisma.EmprestimoGetPayload<{ include: { conta: true; categoria: true; lancamentos: true } }>;

function Detalhe({ emp, r, editar }: { emp: Emp; r: { pagas: number; saldo: number; pago: number }; editar: boolean }) {
  const total = emp.lancamentos.length;
  const hoje = new Date();
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
          <Atributos
            itens={[
              ["Valor contratado", brl(emp.valor)],
              ["Parcela", brl(emp.valorParcela)],
              ["Taxa ao mês", emp.taxaMensal != null ? `${emp.taxaMensal}%` : null],
              ["Custo total", brl(emp.lancamentos.reduce((s, l) => s + l.valor, 0))],
              ["Conta de débito", emp.conta.nome],
              ["Categoria", emp.categoria?.nome],
              ["1º vencimento", fmtData(emp.primeiroVencimento)],
              ["Observações", emp.observacoes],
            ]}
          />
          <div className="space-y-2 rounded-md bg-muted/60 p-4">
            <p className="text-xs text-muted-foreground">Saldo devedor</p>
            <p className="tabular text-2xl font-semibold text-destructive">{brl(r.saldo)}</p>
            <Progress value={total ? (r.pagas / total) * 100 : 0} />
            <p className="text-xs text-muted-foreground">
              {r.pagas} de {total} parcelas pagas · {brl(r.pago)}
            </p>
          </div>
        </div>
      </Card>

      {editar ? (
        <Card titulo="Editar dados">
          <form action={salvarEmprestimo} className="grid gap-3 md:grid-cols-4">
            <input type="hidden" name="id" value={emp.id} />
            <Campo rotulo="Descrição" className="md:col-span-2">
              <Entrada name="descricao" required defaultValue={emp.descricao} />
            </Campo>
            <Campo rotulo="Credor">
              <Entrada name="credor" defaultValue={emp.credor ?? ""} />
            </Campo>
            <Campo rotulo="Taxa ao mês (%)">
              <Entrada name="taxaMensal" inputMode="decimal" defaultValue={emp.taxaMensal ?? ""} />
            </Campo>
            <Campo rotulo="Observações" className="md:col-span-4">
              <AreaTexto name="observacoes" rows={2} defaultValue={emp.observacoes ?? ""} />
            </Campo>
            <div className="flex justify-end gap-2 md:col-span-4">
              <BotaoLink variante="secundario" href={`/financeiro/emprestimos?ver=${emp.id}`}>
                Cancelar
              </BotaoLink>
              <Botao>Salvar</Botao>
            </div>
          </form>
        </Card>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <BotaoLink variante="secundario" href={`/financeiro/emprestimos?ver=${emp.id}&editar=1`}>
            Editar dados
          </BotaoLink>
          {r.saldo > 0 && (
            <form action={quitarEmprestimo} className="flex items-center gap-2">
              <input type="hidden" name="id" value={emp.id} />
              <Entrada type="date" name="data" defaultValue={inputData(new Date())} className="w-40" />
              <BotaoConfirmar variante="secundario" mensagem="Dar baixa em todas as parcelas em aberto?">
                Quitar saldo
              </BotaoConfirmar>
            </form>
          )}
          <form action={excluirEmprestimo} className="ml-auto">
            <input type="hidden" name="id" value={emp.id} />
            <BotaoConfirmar variante="fantasma" className="text-destructive" mensagem="Excluir o empréstimo e todas as parcelas?">
              <Trash2 size={14} /> Excluir empréstimo
            </BotaoConfirmar>
          </form>
        </div>
      )}

      <Tabela colunas={["", "Parcela", "Vencimento", "Valor", "Pago em", "Situação"]}>
        {emp.lancamentos.map((l) => (
          <tr key={l.id}>
            <Td className="w-10 py-1.5">
              <form action={alternarPagamento}>
                <input type="hidden" name="id" value={l.id} />
                <button
                  title={l.pagamento ? "Reabrir parcela" : "Dar baixa"}
                  className={cx("flex size-5 items-center justify-center rounded-sm border", l.pagamento ? "border-success bg-success text-white" : "border-border hover:border-success")}
                >
                  {l.pagamento && <Check size={12} />}
                </button>
              </form>
            </Td>
            <Td className="tabular py-1.5">
              {l.parcela ?? "—"}/{total}
            </Td>
            <Td className="py-1.5">{l.pagamento ? fmtData(l.vencimento) : <Prazo iso={l.vencimento.toISOString()} />}</Td>
            <Td className="tabular py-1.5">{brl(l.valor)}</Td>
            <Td className="py-1.5">{fmtData(l.pagamento)}</Td>
            <Td className="py-1.5">
              {l.pagamento ? <Pilula tom="verde">Paga</Pilula> : l.vencimento < hoje ? <Pilula tom="vermelho">Vencida</Pilula> : <Pilula tom="cinza">Em aberto</Pilula>}
            </Td>
          </tr>
        ))}
      </Tabela>
    </div>
  );
}
