"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirFinanceiro } from "@/lib/acesso";
import { db } from "@/lib/db";
import { bool, data, numero, obrigatorio, texto } from "@/lib/form";

export async function salvarLancamento(fd: FormData) {
  const u = await exigirFinanceiro();
  const e = u.escritorioId;
  const id = texto(fd, "id");
  const tipo = obrigatorio(fd, "tipo");
  const valor = numero(fd, "valor");
  if (!valor || valor <= 0) throw new Error("Informe um valor maior que zero.");
  const vencimento = data(fd, "vencimento") ?? new Date();

  const contaId = obrigatorio(fd, "contaId");
  const contaDestinoId = tipo === "TRANSFERENCIA" ? obrigatorio(fd, "contaDestinoId") : null;
  const categoriaId = tipo === "TRANSFERENCIA" ? null : texto(fd, "categoriaId");
  const clienteId = texto(fd, "clienteId");
  let processoId = texto(fd, "processoId");

  await db.contaBancaria.findFirstOrThrow({ where: { id: contaId, escritorioId: e } });
  if (contaDestinoId) await db.contaBancaria.findFirstOrThrow({ where: { id: contaDestinoId, escritorioId: e } });
  if (categoriaId) await db.categoriaFinanceira.findFirstOrThrow({ where: { id: categoriaId, escritorioId: e } });
  if (clienteId) await db.cliente.findFirstOrThrow({ where: { id: clienteId, escritorioId: e } });
  if (processoId) {
    const p = await db.processo.findFirstOrThrow({ where: { id: processoId, escritorioId: e } });
    if (clienteId && p.clienteId !== clienteId) processoId = null;
  }

  const base = {
    tipo,
    descricao: obrigatorio(fd, "descricao"),
    valor,
    pagamento: bool(fd, "pago") ? data(fd, "pagamento") ?? new Date() : null,
    competencia: data(fd, "competencia"),
    observacoes: texto(fd, "observacoes"),
    contaId,
    contaDestinoId,
    categoriaId,
    clienteId,
    processoId,
  };

  if (id) {
    await db.lancamento.update({ where: { id, escritorioId: e }, data: { ...base, vencimento } });
  } else {
    // Parcelamento: cria N lançamentos com vencimento mensal.
    const parcelas = Math.min(Math.max(Math.trunc(numero(fd, "parcelas") ?? 1), 1), 120);
    for (let i = 0; i < parcelas; i++) {
      const venc = new Date(vencimento);
      venc.setMonth(venc.getMonth() + i);
      await db.lancamento.create({
        data: {
          ...base,
          descricao: parcelas > 1 ? `${base.descricao} (${i + 1}/${parcelas})` : base.descricao,
          vencimento: venc,
          pagamento: i === 0 ? base.pagamento : null,
          escritorioId: e,
        },
      });
    }
  }
  revalidatePath("/financeiro", "layout");
  const voltar = texto(fd, "voltar");
  redirect(voltar?.startsWith("/") ? voltar : `/financeiro?mes=${vencimento.toISOString().slice(0, 7)}`);
}

export async function alternarPagamento(fd: FormData) {
  const u = await exigirFinanceiro();
  const id = obrigatorio(fd, "id");
  const l = await db.lancamento.findFirstOrThrow({ where: { id, escritorioId: u.escritorioId } });
  await db.lancamento.update({ where: { id }, data: { pagamento: l.pagamento ? null : new Date() } });
  revalidatePath("/financeiro", "layout");
}

export async function excluirLancamento(fd: FormData) {
  const u = await exigirFinanceiro();
  await db.lancamento.delete({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  revalidatePath("/financeiro", "layout");
}

export async function salvarConta(fd: FormData) {
  const u = await exigirFinanceiro();
  await db.contaBancaria.create({
    data: { nome: obrigatorio(fd, "nome"), saldoInicial: numero(fd, "saldoInicial") ?? 0, escritorioId: u.escritorioId },
  });
  revalidatePath("/financeiro", "layout");
}

export async function salvarCategoria(fd: FormData) {
  const u = await exigirFinanceiro();
  await db.categoriaFinanceira.create({
    data: { nome: obrigatorio(fd, "nome"), tipo: obrigatorio(fd, "tipo"), escritorioId: u.escritorioId },
  });
  revalidatePath("/financeiro", "layout");
  revalidatePath("/configuracoes");
}
