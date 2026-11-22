"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { obrigatorio, texto } from "@/lib/form";

function dataHora(fd: FormData, campo: string) {
  const v = texto(fd, campo);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function salvarEvento(fd: FormData) {
  const u = await exigirUsuario();
  const id = texto(fd, "id");
  const inicio = dataHora(fd, "inicio");
  if (!inicio) throw new Error("Informe a data de início.");
  const processoId = texto(fd, "processoId");
  const usuarioId = texto(fd, "usuarioId");
  if (processoId) await db.processo.findFirstOrThrow({ where: { id: processoId, escritorioId: u.escritorioId } });
  if (usuarioId) await db.usuario.findFirstOrThrow({ where: { id: usuarioId, escritorioId: u.escritorioId } });
  const dados = {
    titulo: obrigatorio(fd, "titulo"),
    tipo: texto(fd, "tipo") ?? "COMPROMISSO",
    inicio,
    fim: dataHora(fd, "fim"),
    local: texto(fd, "local"),
    descricao: texto(fd, "descricao"),
    processoId,
    usuarioId,
  };
  if (id) await db.evento.update({ where: { id, escritorioId: u.escritorioId }, data: dados });
  else await db.evento.create({ data: { ...dados, escritorioId: u.escritorioId } });
  revalidatePath("/agenda");
  revalidatePath("/painel");
  redirect(`/agenda?mes=${inicio.toISOString().slice(0, 7)}`);
}

export async function excluirEvento(fd: FormData) {
  const u = await exigirUsuario();
  await db.evento.delete({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  revalidatePath("/agenda");
  redirect("/agenda");
}
