"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { data, obrigatorio, texto } from "@/lib/form";
import { etapaInicialProcesso } from "@/lib/funil";

type Usuario = Awaited<ReturnType<typeof exigirUsuario>>;

async function buscar(u: Usuario, id: string) {
  const i = await db.inicial.findFirstOrThrow({ where: { id, escritorioId: u.escritorioId } });
  if (u.carteiraRestrita && i.responsavelId !== u.id) throw new Error("Inicial de outra carteira.");
  return i;
}

export async function salvarInicial(fd: FormData) {
  const u = await exigirUsuario();
  const id = texto(fd, "id");
  if (id) await buscar(u, id);
  const clienteId = obrigatorio(fd, "clienteId");
  await db.cliente.findFirstOrThrow({ where: { id: clienteId, escritorioId: u.escritorioId } });
  const responsavelId = u.carteiraRestrita ? u.id : texto(fd, "responsavelId");
  if (responsavelId) await db.usuario.findFirstOrThrow({ where: { id: responsavelId, escritorioId: u.escritorioId } });
  const dados = {
    titulo: obrigatorio(fd, "titulo"),
    area: texto(fd, "area"),
    parteContraria: texto(fd, "parteContraria"),
    status: texto(fd, "status") ?? "A_ELABORAR",
    prazo: data(fd, "prazo"),
    pendencias: texto(fd, "pendencias"),
    observacoes: texto(fd, "observacoes"),
    clienteId,
    responsavelId,
  };
  if (id) await db.inicial.update({ where: { id }, data: dados });
  else await db.inicial.create({ data: { ...dados, escritorioId: u.escritorioId } });
  revalidatePath("/iniciais");
  revalidatePath("/painel");
  redirect("/iniciais");
}

/** Marca a inicial como protocolada e cria o processo correspondente na 1ª instância. */
export async function protocolarInicial(fd: FormData) {
  const u = await exigirUsuario();
  const i = await buscar(u, obrigatorio(fd, "id"));
  if (i.processoId) redirect(`/processos/${i.processoId}`);
  const numero = texto(fd, "numero")?.replace(/\D/g, "") || null;
  const quando = data(fd, "protocoladaEm") ?? new Date();
  const etapa = await etapaInicialProcesso(u.escritorioId);
  const processo = await db.processo.create({
    data: {
      titulo: i.titulo,
      numero,
      area: i.area,
      parteContraria: i.parteContraria,
      instancia: "1ª instância",
      distribuidoEm: quando,
      clienteId: i.clienteId,
      responsavelId: i.responsavelId,
      etapaId: etapa?.id,
      escritorioId: u.escritorioId,
      andamentos: { create: { data: quando, descricao: `Petição inicial protocolada (controle de iniciais) por ${u.nome}.` } },
    },
  });
  await db.inicial.update({ where: { id: i.id }, data: { status: "PROTOCOLADA", protocoladaEm: quando, processoId: processo.id } });
  revalidatePath("/iniciais");
  revalidatePath("/processos");
  redirect(`/processos/${processo.id}?editar=1`);
}

export async function excluirInicial(fd: FormData) {
  const u = await exigirUsuario();
  const i = await buscar(u, obrigatorio(fd, "id"));
  await db.inicial.delete({ where: { id: i.id } });
  revalidatePath("/iniciais");
  redirect("/iniciais");
}
