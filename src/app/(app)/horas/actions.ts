"use server";

import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { bool, data, numero, obrigatorio, texto } from "@/lib/form";

/** Aceita "1:30", "1h30", "1,5" ou "90min". */
function lerMinutos(v: string | null): number {
  if (!v) return 0;
  const s = v.trim().toLowerCase();
  const hm = s.match(/^(\d+)\s*[:h]\s*(\d{1,2})?\s*(m|min)?$/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2] ?? 0);
  const min = s.match(/^(\d+)\s*(m|min)$/);
  if (min) return Number(min[1]);
  const dec = Number(s.replace(",", "."));
  return Number.isFinite(dec) ? Math.round(dec * 60) : 0;
}

export async function registrarHoras(fd: FormData) {
  const u = await exigirUsuario();
  const minutos = lerMinutos(texto(fd, "duracao"));
  if (minutos <= 0) throw new Error("Informe a duração (ex.: 1:30).");
  let clienteId = texto(fd, "clienteId");
  const processoId = texto(fd, "processoId");
  if (processoId) {
    const p = await db.processo.findFirstOrThrow({ where: { id: processoId, escritorioId: u.escritorioId } });
    clienteId = p.clienteId;
  } else if (clienteId) {
    await db.cliente.findFirstOrThrow({ where: { id: clienteId, escritorioId: u.escritorioId } });
  }
  const valorHora = numero(fd, "valorHora");
  await db.registroHoras.create({
    data: {
      data: data(fd, "data") ?? new Date(),
      minutos,
      descricao: obrigatorio(fd, "descricao"),
      faturavel: bool(fd, "faturavel"),
      valorHora,
      clienteId,
      processoId,
      usuarioId: u.id,
      escritorioId: u.escritorioId,
    },
  });
  // Lembra o valor-hora usado como padrão do usuário.
  if (valorHora && valorHora !== u.valorHora) await db.usuario.update({ where: { id: u.id }, data: { valorHora } });
  revalidatePath("/horas");
}

export async function excluirHoras(fd: FormData) {
  const u = await exigirUsuario();
  await db.registroHoras.delete({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId, faturado: false } });
  revalidatePath("/horas");
}

/** Gera uma receita com as horas faturáveis em aberto do cliente e marca as horas como faturadas. */
export async function faturarHoras(fd: FormData) {
  const u = await exigirUsuario();
  const clienteId = obrigatorio(fd, "clienteId");
  const cliente = await db.cliente.findFirstOrThrow({ where: { id: clienteId, escritorioId: u.escritorioId } });
  const horas = await db.registroHoras.findMany({ where: { escritorioId: u.escritorioId, clienteId, faturavel: true, faturado: false } });
  const total = horas.reduce((s, h) => s + (h.minutos / 60) * (h.valorHora ?? 0), 0);
  if (!horas.length || total <= 0) throw new Error("Não há horas com valor para faturar.");

  const [conta, categoria] = await Promise.all([
    db.contaBancaria.findFirstOrThrow({ where: { escritorioId: u.escritorioId }, orderBy: { nome: "asc" } }),
    db.categoriaFinanceira.findFirst({ where: { escritorioId: u.escritorioId, tipo: "RECEITA", nome: { contains: "Consultoria" } } }),
  ]);
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 10);
  const totalMin = horas.reduce((s, h) => s + h.minutos, 0);

  await db.$transaction([
    db.lancamento.create({
      data: {
        tipo: "RECEITA",
        descricao: `Honorários por hora – ${cliente.nome} (${Math.floor(totalMin / 60)}h${String(totalMin % 60).padStart(2, "0")})`,
        valor: Math.round(total * 100) / 100,
        vencimento,
        contaId: conta.id,
        categoriaId: categoria?.id,
        clienteId,
        escritorioId: u.escritorioId,
      },
    }),
    db.registroHoras.updateMany({ where: { id: { in: horas.map((h) => h.id) } }, data: { faturado: true } }),
  ]);
  revalidatePath("/horas");
  revalidatePath("/financeiro");
}
