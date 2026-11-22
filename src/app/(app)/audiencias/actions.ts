"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAcessoProcesso } from "@/lib/acesso";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { obrigatorio, texto } from "@/lib/form";

function dataHora(fd: FormData, campo: string) {
  const v = obrigatorio(fd, campo);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error("Data da audiência inválida.");
  return d;
}

function atualizar(processoId: string) {
  revalidatePath("/audiencias");
  revalidatePath("/painel");
  revalidatePath(`/processos/${processoId}`);
}

export async function salvarAudiencia(fd: FormData) {
  const u = await exigirUsuario();
  const id = texto(fd, "id");
  const processoId = obrigatorio(fd, "processoId");
  exigirAcessoProcesso(u, await db.processo.findFirstOrThrow({ where: { id: processoId, escritorioId: u.escritorioId } }));
  const responsavelId = texto(fd, "responsavelId");
  if (responsavelId) await db.usuario.findFirstOrThrow({ where: { id: responsavelId, escritorioId: u.escritorioId } });
  const dados = {
    tipo: texto(fd, "tipo") ?? "CONCILIACAO",
    data: dataHora(fd, "data"),
    modalidade: texto(fd, "modalidade") ?? "PRESENCIAL",
    local: texto(fd, "local"),
    status: texto(fd, "status") ?? "DESIGNADA",
    testemunhas: texto(fd, "testemunhas"),
    resultado: texto(fd, "resultado"),
    observacoes: texto(fd, "observacoes"),
    processoId,
    responsavelId,
  };
  if (id) await db.audiencia.update({ where: { id, escritorioId: u.escritorioId }, data: dados });
  else await db.audiencia.create({ data: { ...dados, escritorioId: u.escritorioId } });
  atualizar(processoId);
  const voltar = texto(fd, "voltar");
  redirect(voltar && voltar.startsWith("/") ? voltar : "/audiencias");
}

export async function excluirAudiencia(fd: FormData) {
  const u = await exigirUsuario();
  const a = await db.audiencia.findFirstOrThrow({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId }, include: { processo: true } });
  exigirAcessoProcesso(u, a.processo);
  await db.audiencia.delete({ where: { id: a.id } });
  atualizar(a.processoId);
  redirect("/audiencias");
}
