"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAcessoProcesso, exigirFinanceiro } from "@/lib/acesso";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { data, numero, obrigatorio, texto } from "@/lib/form";
import { TIPO_REQUISICAO, parteEscritorio } from "@/lib/rotulos";

function atualizar(processoId: string) {
  revalidatePath("/financeiro", "layout");
  revalidatePath("/processos");
  revalidatePath(`/processos/${processoId}`);
}

/** Advogados também cadastram a requisição (a partir do processo); dar baixa é do financeiro. */
export async function salvarRequisicao(fd: FormData) {
  const u = await exigirUsuario();
  const id = texto(fd, "id");
  const processoId = obrigatorio(fd, "processoId");
  const processo = await db.processo.findFirstOrThrow({ where: { id: processoId, escritorioId: u.escritorioId } });
  exigirAcessoProcesso(u, processo);
  const valor = numero(fd, "valor");
  if (!valor || valor <= 0) throw new Error("Informe o valor requisitado.");
  const dados = {
    tipo: texto(fd, "tipo") ?? "RPV",
    numero: texto(fd, "numero"),
    valor,
    percentual: numero(fd, "percentual") ?? processo.honorariosExito,
    status: texto(fd, "status") ?? "A_EXPEDIR",
    expedidaEm: data(fd, "expedidaEm"),
    previsao: data(fd, "previsao"),
    observacoes: texto(fd, "observacoes"),
    processoId,
  };
  if (dados.status === "PAGA") throw new Error("Use “Registrar pagamento” para dar baixa.");
  if (id) {
    const atual = await db.requisicao.findFirstOrThrow({ where: { id, escritorioId: u.escritorioId } });
    if (atual.status === "PAGA") throw new Error("Requisição já paga; estorne o pagamento antes de editar.");
    await db.requisicao.update({ where: { id }, data: dados });
  } else await db.requisicao.create({ data: { ...dados, escritorioId: u.escritorioId } });
  atualizar(processoId);
  const voltar = texto(fd, "voltar");
  redirect(voltar?.startsWith("/") ? voltar : "/financeiro/rpv");
}

/** Registra o pagamento: gera a receita do escritório (valor × % do contrato) já baixada. */
export async function pagarRequisicao(fd: FormData) {
  const u = await exigirFinanceiro();
  const r = await db.requisicao.findFirstOrThrow({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId }, include: { processo: true } });
  if (r.status === "PAGA") return;
  const contaId = obrigatorio(fd, "contaId");
  await db.contaBancaria.findFirstOrThrow({ where: { id: contaId, escritorioId: u.escritorioId } });
  const quando = data(fd, "pagaEm") ?? new Date();
  const valor = numero(fd, "valorRecebido") ?? parteEscritorio(r);
  const categoria = await db.categoriaFinanceira.findFirst({ where: { escritorioId: u.escritorioId, tipo: "RECEITA", nome: { contains: "xito" } } });
  const lanc = await db.lancamento.create({
    data: {
      tipo: "RECEITA",
      descricao: `${TIPO_REQUISICAO[r.tipo]} ${r.numero ?? ""} – ${r.processo.titulo}`.replace(/\s+/g, " "),
      valor,
      vencimento: quando,
      pagamento: quando,
      contaId,
      categoriaId: categoria?.id,
      clienteId: r.processo.clienteId,
      processoId: r.processoId,
      escritorioId: u.escritorioId,
    },
  });
  await db.requisicao.update({ where: { id: r.id }, data: { status: "PAGA", pagaEm: quando, lancamentoId: lanc.id } });
  await db.andamento.create({ data: { processoId: r.processoId, data: quando, descricao: `${TIPO_REQUISICAO[r.tipo]} paga. Honorários recebidos registrados no financeiro.` } });
  atualizar(r.processoId);
  redirect("/financeiro/rpv");
}

/** Desfaz a baixa: apaga a receita gerada e volta a requisição para "Expedida". */
export async function estornarRequisicao(fd: FormData) {
  const u = await exigirFinanceiro();
  const r = await db.requisicao.findFirstOrThrow({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  await db.requisicao.update({ where: { id: r.id }, data: { status: "EXPEDIDA", pagaEm: null, lancamentoId: null } });
  if (r.lancamentoId) await db.lancamento.deleteMany({ where: { id: r.lancamentoId, escritorioId: u.escritorioId } });
  atualizar(r.processoId);
}

export async function excluirRequisicao(fd: FormData) {
  const u = await exigirFinanceiro();
  const r = await db.requisicao.findFirstOrThrow({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  await db.requisicao.delete({ where: { id: r.id } });
  atualizar(r.processoId);
  redirect("/financeiro/rpv");
}
