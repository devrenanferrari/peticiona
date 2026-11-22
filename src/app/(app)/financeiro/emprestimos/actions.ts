"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirFinanceiro } from "@/lib/acesso";
import { db } from "@/lib/db";
import { bool, data, numero, obrigatorio, texto } from "@/lib/form";

/** Parcela fixa (Price) para a taxa mensal; sem taxa, divide o valor igualmente. */
function parcelaPrice(valor: number, taxaMensal: number | null, n: number) {
  const i = (taxaMensal ?? 0) / 100;
  if (i <= 0) return valor / n;
  return (valor * i) / (1 - Math.pow(1 + i, -n));
}

export async function salvarEmprestimo(fd: FormData) {
  const u = await exigirFinanceiro();
  const e = u.escritorioId;
  const id = texto(fd, "id");
  const descricao = obrigatorio(fd, "descricao");
  const comum = { descricao, credor: texto(fd, "credor"), observacoes: texto(fd, "observacoes"), taxaMensal: numero(fd, "taxaMensal") };

  if (id) {
    await db.emprestimo.update({ where: { id, escritorioId: e }, data: comum });
    revalidatePath("/financeiro", "layout");
    redirect(`/financeiro/emprestimos?ver=${id}`);
  }

  const valor = numero(fd, "valor");
  const parcelas = Math.trunc(numero(fd, "parcelas") ?? 0);
  if (!valor || valor <= 0) throw new Error("Informe o valor contratado.");
  if (parcelas < 1 || parcelas > 420) throw new Error("Informe o número de parcelas (1 a 420).");
  const primeiroVencimento = data(fd, "primeiroVencimento");
  if (!primeiroVencimento) throw new Error("Informe o vencimento da 1ª parcela.");
  const contaId = obrigatorio(fd, "contaId");
  await db.contaBancaria.findFirstOrThrow({ where: { id: contaId, escritorioId: e } });
  const categoriaId = texto(fd, "categoriaId");
  if (categoriaId) await db.categoriaFinanceira.findFirstOrThrow({ where: { id: categoriaId, escritorioId: e } });
  // Valor da parcela informado (contrato) prevalece sobre o calculado.
  const valorParcela = Math.round((numero(fd, "valorParcela") ?? parcelaPrice(valor, comum.taxaMensal, parcelas)) * 100) / 100;

  const emp = await db.emprestimo.create({
    data: {
      ...comum,
      valor,
      parcelas,
      valorParcela,
      primeiroVencimento,
      contaId,
      categoriaId,
      escritorioId: e,
      lancamentos: {
        create: Array.from({ length: parcelas }, (_, i) => {
          const venc = new Date(primeiroVencimento);
          venc.setMonth(venc.getMonth() + i);
          return { tipo: "DESPESA", descricao: `${descricao} – parcela ${i + 1}/${parcelas}`, valor: valorParcela, vencimento: venc, parcela: i + 1, contaId, categoriaId, escritorioId: e };
        }),
      },
    },
  });

  // Entrada do dinheiro do empréstimo na conta (opcional).
  if (bool(fd, "lancarEntrada")) {
    await db.lancamento.create({
      data: {
        tipo: "RECEITA",
        descricao: `Entrada do empréstimo – ${descricao}`,
        valor,
        vencimento: data(fd, "dataEntrada") ?? new Date(),
        pagamento: data(fd, "dataEntrada") ?? new Date(),
        contaId,
        escritorioId: e,
        observacoes: "Captação de empréstimo (não é receita operacional).",
      },
    });
  }
  revalidatePath("/financeiro", "layout");
  redirect(`/financeiro/emprestimos?ver=${emp.id}`);
}

export async function excluirEmprestimo(fd: FormData) {
  const u = await exigirFinanceiro();
  await db.emprestimo.delete({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  revalidatePath("/financeiro", "layout");
  redirect("/financeiro/emprestimos");
}

/** Liquida antecipadamente: dá baixa em todas as parcelas em aberto na data informada. */
export async function quitarEmprestimo(fd: FormData) {
  const u = await exigirFinanceiro();
  const id = obrigatorio(fd, "id");
  await db.emprestimo.findFirstOrThrow({ where: { id, escritorioId: u.escritorioId } });
  await db.lancamento.updateMany({ where: { emprestimoId: id, pagamento: null }, data: { pagamento: data(fd, "data") ?? new Date() } });
  revalidatePath("/financeiro", "layout");
}
