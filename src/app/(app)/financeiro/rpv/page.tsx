import Link from "next/link";
import { Banknote, Plus, Trash2, Undo2 } from "lucide-react";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Grade, type Coluna, type Linha } from "@/components/grade";
import { AreaTexto, Botao, BotaoLink, Cabecalho, Campo, Card, Entrada, Indicador, Selecao } from "@/components/kit";
import { exigirFinanceiro } from "@/lib/acesso";
import { db } from "@/lib/db";
import { brl, fmtCNJ, fmtData, inputData } from "@/lib/format";
import { STATUS_REQUISICAO, TIPO_REQUISICAO, opcoes, parteEscritorio, status } from "@/lib/rotulos";
import { AbasFinanceiro } from "../abas";
import { estornarRequisicao, excluirRequisicao, pagarRequisicao, salvarRequisicao } from "./actions";

export const metadata = { title: "RPV e precatórios" };

const COLUNAS: Coluna[] = [
  { chave: "tipo", rotulo: "Tipo", link: true },
  { chave: "numeroReq", rotulo: "Nº da requisição", tipo: "mono" },
  { chave: "processo", rotulo: "Processo", tipo: "mono" },
  { chave: "cliente", rotulo: "Cliente" },
  { chave: "tribunal", rotulo: "Tribunal", oculta: true },
  { chave: "valor", rotulo: "Valor requisitado", tipo: "moeda", total: true },
  { chave: "percentual", rotulo: "% contrato", tipo: "percentual" },
  { chave: "parte", rotulo: "Parte do escritório", tipo: "moeda", total: true },
  { chave: "expedidaEm", rotulo: "Expedida em", tipo: "data" },
  { chave: "previsao", rotulo: "Previsão de pagamento", tipo: "data" },
  { chave: "pagaEm", rotulo: "Paga em", tipo: "data", oculta: true },
  { chave: "status", rotulo: "Status", tipo: "status" },
];

export default async function Requisicoes({ searchParams }: { searchParams: Promise<{ novo?: string; editar?: string; processo?: string }> }) {
  const sp = await searchParams;
  const u = await exigirFinanceiro();
  const e = u.escritorioId;

  const [requisicoes, processos, contas] = await Promise.all([
    db.requisicao.findMany({
      where: { escritorioId: e },
      include: { processo: { include: { cliente: { select: { nome: true } } } } },
      orderBy: [{ previsao: "asc" }, { criadoEm: "desc" }],
    }),
    sp.novo || sp.editar ? db.processo.findMany({ where: { escritorioId: e }, include: { cliente: { select: { nome: true } } }, orderBy: { titulo: "asc" } }) : [],
    db.contaBancaria.findMany({ where: { escritorioId: e }, orderBy: { nome: "asc" } }),
  ]);

  const linhas: Linha[] = requisicoes.map((r) => ({
    id: r.id,
    href: `/financeiro/rpv?editar=${r.id}`,
    tipo: TIPO_REQUISICAO[r.tipo] ?? r.tipo,
    numeroReq: r.numero,
    processo: fmtCNJ(r.processo.numero) || r.processo.titulo,
    cliente: r.processo.cliente.nome,
    tribunal: r.processo.tribunal,
    valor: r.valor,
    percentual: r.percentual,
    parte: parteEscritorio(r),
    expedidaEm: r.expedidaEm?.toISOString(),
    previsao: r.previsao?.toISOString(),
    pagaEm: r.pagaEm?.toISOString(),
    status: status(STATUS_REQUISICAO, r.status),
  }));

  const soma = (st: string) => requisicoes.filter((r) => r.status === st).reduce((s, r) => s + parteEscritorio(r), 0);
  const r = sp.editar ? requisicoes.find((x) => x.id === sp.editar) : null;
  const formAberto = sp.novo || r;

  return (
    <>
      <Cabecalho
        titulo="RPV e precatórios"
        codigo="RPV"
        subtitulo="Requisições de pagamento dos processos. A parte do escritório entra no fluxo projetado pela previsão de pagamento."
        acoes={
          <BotaoLink href="/financeiro/rpv?novo=1">
            <Plus size={16} /> Nova requisição
          </BotaoLink>
        }
        abas={<AbasFinanceiro ativa="/financeiro/rpv" />}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Indicador rotulo="A expedir (parte do escritório)" valor={brl(soma("A_EXPEDIR"))} />
        <Indicador rotulo="Expedidas, aguardando pagamento" valor={brl(soma("EXPEDIDA"))} cor="text-success" />
        <Indicador rotulo="Recebidas" valor={brl(soma("PAGA"))} />
      </div>

      {formAberto && (
        <div className="mb-4 grid gap-4 xl:grid-cols-3">
          <Card titulo={r ? `${TIPO_REQUISICAO[r.tipo]} · ${r.processo.titulo}` : "Nova requisição"} className="xl:col-span-2">
            {r?.status === "PAGA" ? (
              <div className="space-y-3 text-sm">
                <p>
                  Paga em <b>{fmtData(r.pagaEm)}</b>. A receita foi lançada no financeiro{" "}
                  <Link className="text-marca hover:underline" href={`/processos/${r.processoId}`}>
                    (ver processo)
                  </Link>
                  .
                </p>
                <form action={estornarRequisicao}>
                  <input type="hidden" name="id" value={r.id} />
                  <BotaoConfirmar variante="secundario" mensagem="Estornar o pagamento? A receita gerada será excluída.">
                    <Undo2 size={14} /> Estornar pagamento
                  </BotaoConfirmar>
                </form>
              </div>
            ) : (
              <form action={salvarRequisicao} className="grid gap-3 md:grid-cols-4">
                {r && <input type="hidden" name="id" value={r.id} />}
                <Campo rotulo="Processo *" className="md:col-span-2">
                  <Selecao
                    name="processoId"
                    required
                    defaultValue={r?.processoId ?? sp.processo ?? ""}
                    vazio="Selecione..."
                    opcoes={processos.map((p) => [p.id, `${fmtCNJ(p.numero) || "s/ nº"} · ${p.titulo} (${p.cliente.nome})`])}
                  />
                </Campo>
                <Campo rotulo="Tipo">
                  <Selecao name="tipo" defaultValue={r?.tipo ?? "RPV"} opcoes={opcoes(TIPO_REQUISICAO)} />
                </Campo>
                <Campo rotulo="Nº da requisição">
                  <Entrada name="numero" defaultValue={r?.numero ?? ""} />
                </Campo>
                <Campo rotulo="Valor requisitado (R$) *">
                  <Entrada name="valor" required inputMode="decimal" defaultValue={r?.valor ?? ""} />
                </Campo>
                <Campo rotulo="% do contrato" dica="Vazio = usa o % do processo">
                  <Entrada name="percentual" inputMode="decimal" defaultValue={r?.percentual ?? ""} />
                </Campo>
                <Campo rotulo="Status">
                  <Selecao name="status" defaultValue={r?.status ?? "A_EXPEDIR"} opcoes={opcoes(STATUS_REQUISICAO).filter(([v]) => v !== "PAGA")} />
                </Campo>
                <Campo rotulo="Expedida em">
                  <Entrada type="date" name="expedidaEm" defaultValue={inputData(r?.expedidaEm)} />
                </Campo>
                <Campo rotulo="Previsão de pagamento">
                  <Entrada type="date" name="previsao" defaultValue={inputData(r?.previsao)} />
                </Campo>
                <Campo rotulo="Observações" className="md:col-span-3">
                  <AreaTexto name="observacoes" rows={1} defaultValue={r?.observacoes ?? ""} />
                </Campo>
                <div className="flex justify-end gap-2 md:col-span-4">
                  <BotaoLink variante="secundario" href="/financeiro/rpv">
                    Cancelar
                  </BotaoLink>
                  <Botao>Salvar</Botao>
                </div>
              </form>
            )}
            {r && (
              <form action={excluirRequisicao} className="mt-2 border-t pt-2">
                <input type="hidden" name="id" value={r.id} />
                <BotaoConfirmar variante="fantasma" className="text-destructive" mensagem="Excluir esta requisição?">
                  <Trash2 size={14} /> Excluir
                </BotaoConfirmar>
              </form>
            )}
          </Card>

          {r && r.status !== "PAGA" && (
            <Card titulo={<><Banknote size={16} /> Registrar pagamento</>}>
              <form action={pagarRequisicao} className="space-y-3">
                <input type="hidden" name="id" value={r.id} />
                <Campo rotulo="Valor recebido pelo escritório (R$)" dica={`Calculado: ${brl(parteEscritorio(r))}`}>
                  <Entrada name="valorRecebido" inputMode="decimal" defaultValue={parteEscritorio(r).toFixed(2).replace(".", ",")} />
                </Campo>
                <Campo rotulo="Pago em">
                  <Entrada type="date" name="pagaEm" defaultValue={inputData(new Date())} />
                </Campo>
                <Campo rotulo="Conta">
                  <Selecao name="contaId" required defaultValue={contas[0]?.id} opcoes={contas.map((c) => [c.id, c.nome])} />
                </Campo>
                <Botao variante="sucesso" className="w-full">
                  Dar baixa e lançar receita
                </Botao>
              </form>
            </Card>
          )}
        </div>
      )}

      <Grade id="rpv" titulo="Requisições" colunas={COLUNAS} linhas={linhas} vazio="Nenhuma RPV ou precatório cadastrado." />
    </>
  );
}
