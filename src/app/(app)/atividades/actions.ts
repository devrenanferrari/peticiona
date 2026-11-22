"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { bool, data, numero, obrigatorio, texto } from "@/lib/form";

export async function salvarTarefa(fd: FormData) {
  const u = await exigirUsuario();
  const id = texto(fd, "id");
  const processoId = texto(fd, "processoId");
  const responsavelId = texto(fd, "responsavelId");
  if (processoId) await db.processo.findFirstOrThrow({ where: { id: processoId, escritorioId: u.escritorioId } });
  if (responsavelId) await db.usuario.findFirstOrThrow({ where: { id: responsavelId, escritorioId: u.escritorioId } });
  const dados = {
    titulo: obrigatorio(fd, "titulo"),
    descricao: texto(fd, "descricao"),
    prazo: data(fd, "prazo"),
    prioridade: texto(fd, "prioridade") ?? "NORMAL",
    tipo: texto(fd, "tipo") ?? "TAREFA",
    pontos: numero(fd, "pontos") ?? 1,
    importante: bool(fd, "importante"),
    processoId,
    responsavelId,
  };
  if (id) await db.tarefa.update({ where: { id, escritorioId: u.escritorioId }, data: dados });
  else await db.tarefa.create({ data: { ...dados, criadorId: u.id, escritorioId: u.escritorioId } });
  revalidatePath("/atividades");
  revalidatePath("/painel");
  const voltar = texto(fd, "voltar");
  redirect(voltar && voltar.startsWith("/") ? voltar : "/atividades");
}

export async function alternarConclusao(fd: FormData) {
  const u = await exigirUsuario();
  const id = obrigatorio(fd, "id");
  const t = await db.tarefa.findFirstOrThrow({ where: { id, escritorioId: u.escritorioId } });
  await db.tarefa.update({ where: { id }, data: { concluida: !t.concluida, concluidaEm: t.concluida ? null : new Date() } });
  revalidatePath("/atividades");
  revalidatePath("/painel");
  if (t.processoId) revalidatePath(`/processos/${t.processoId}`);
}

export async function alternarImportante(fd: FormData) {
  const u = await exigirUsuario();
  const id = obrigatorio(fd, "id");
  const t = await db.tarefa.findFirstOrThrow({ where: { id, escritorioId: u.escritorioId } });
  await db.tarefa.update({ where: { id }, data: { importante: !t.importante } });
  revalidatePath("/atividades");
}

export async function excluirTarefa(fd: FormData) {
  const u = await exigirUsuario();
  await db.tarefa.delete({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  revalidatePath("/atividades");
  revalidatePath("/painel");
}
