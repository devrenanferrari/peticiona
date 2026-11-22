"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { obrigatorio, texto } from "@/lib/form";

const STATUS = ["NOVO", "EM_CONTATO", "PROPOSTA", "CONVERTIDO", "DESCARTADO"];

export async function criarLead(fd: FormData) {
  const u = await exigirUsuario();
  await db.lead.create({
    data: {
      nome: obrigatorio(fd, "nome"),
      email: obrigatorio(fd, "email").toLowerCase(),
      telefone: texto(fd, "telefone"),
      empresa: texto(fd, "empresa"),
      area: texto(fd, "area"),
      mensagem: texto(fd, "mensagem"),
      origem: texto(fd, "origem") ?? "OUTRO",
      escritorioId: u.escritorioId,
    },
  });
  revalidatePath("/leads");
  redirect("/leads");
}

export async function mudarStatusLead(id: string, status: string) {
  const u = await exigirUsuario();
  if (!STATUS.includes(status)) throw new Error("Status inválido");
  await db.lead.update({ where: { id, escritorioId: u.escritorioId }, data: { status } });
  revalidatePath("/leads");
}

export async function salvarObservacaoLead(fd: FormData) {
  const u = await exigirUsuario();
  await db.lead.update({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId }, data: { observacoes: texto(fd, "observacoes") } });
  revalidatePath("/leads");
}

/** Transforma o lead em contato (cliente) e abre o cadastro para completar os dados. */
export async function converterLead(fd: FormData) {
  const u = await exigirUsuario();
  const lead = await db.lead.findFirstOrThrow({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  if (lead.clienteId) redirect(`/clientes/${lead.clienteId}`);
  const pj = Boolean(lead.empresa);
  const cliente = await db.cliente.create({
    data: {
      tipo: pj ? "PJ" : "PF",
      nome: lead.empresa ?? lead.nome,
      email: lead.email,
      celular: lead.telefone,
      origem: lead.origem === "SITE" ? "Site" : lead.origem,
      observacoes: [pj && `Contato: ${lead.nome}`, lead.area && `Interesse: ${lead.area}`, lead.mensagem, lead.observacoes].filter(Boolean).join("\n"),
      escritorioId: u.escritorioId,
    },
  });
  await db.lead.update({ where: { id: lead.id }, data: { status: "CONVERTIDO", clienteId: cliente.id } });
  revalidatePath("/leads");
  redirect(`/clientes/${cliente.id}?editar=1`);
}

export async function excluirLead(fd: FormData) {
  const u = await exigirUsuario();
  await db.lead.delete({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  revalidatePath("/leads");
}
