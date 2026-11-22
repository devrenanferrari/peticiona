"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAcessoProcesso } from "@/lib/acesso";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { data, numero, obrigatorio, texto } from "@/lib/form";
import { etapaInicialProcesso } from "@/lib/funil";

async function garantirDoEscritorio(escritorioId: string, ids: { clienteId?: string | null; responsavelId?: string | null; etapaId?: string | null }) {
  if (ids.clienteId) await db.cliente.findFirstOrThrow({ where: { id: ids.clienteId, escritorioId } });
  if (ids.responsavelId) await db.usuario.findFirstOrThrow({ where: { id: ids.responsavelId, escritorioId } });
  if (ids.etapaId) await db.etapa.findFirstOrThrow({ where: { id: ids.etapaId, fase: { escritorioId } } });
}

export async function salvarProcesso(fd: FormData) {
  const u = await exigirUsuario();
  const id = texto(fd, "id");
  const dados = {
    titulo: obrigatorio(fd, "titulo"),
    numero: texto(fd, "numero")?.replace(/\D/g, "") || null,
    area: texto(fd, "area"),
    tipoAcao: texto(fd, "tipoAcao"),
    tribunal: texto(fd, "tribunal"),
    vara: texto(fd, "vara"),
    comarca: texto(fd, "comarca"),
    instancia: texto(fd, "instancia"),
    parteContraria: texto(fd, "parteContraria"),
    posicaoCliente: texto(fd, "posicaoCliente"),
    valorCausa: numero(fd, "valorCausa"),
    honorarios: numero(fd, "honorarios"),
    honorariosExito: numero(fd, "honorariosExito"),
    status: texto(fd, "status") ?? "ATIVO",
    distribuidoEm: data(fd, "distribuidoEm"),
    observacoes: texto(fd, "observacoes"),
    recurso: texto(fd, "recurso"),
    orgaoJulgador: texto(fd, "orgaoJulgador"),
    relator: texto(fd, "relator"),
    materia: texto(fd, "materia"),
    situacao: texto(fd, "situacao"),
    sessaoEm: data(fd, "sessaoEm"),
    clienteId: obrigatorio(fd, "clienteId"),
    responsavelId: texto(fd, "responsavelId"),
    etapaId: texto(fd, "etapaId"),
  };
  await garantirDoEscritorio(u.escritorioId, dados);

  let processoId = id;
  if (id) {
    exigirAcessoProcesso(u, await db.processo.findFirstOrThrow({ where: { id, escritorioId: u.escritorioId } }));
    await db.processo.update({ where: { id, escritorioId: u.escritorioId }, data: dados });
  } else {
    // Sem etapa escolhida, o processo entra no início da fase judicial do funil para aparecer no CRM.
    const etapaId =
      dados.etapaId ??
      (await etapaInicialProcesso(u.escritorioId))?.id ??
      null;
    const p = await db.processo.create({
      data: { ...dados, etapaId, escritorioId: u.escritorioId, andamentos: { create: { descricao: `Processo cadastrado por ${u.nome}.` } } },
    });
    processoId = p.id;
  }
  revalidatePath("/processos");
  redirect(`/processos/${processoId}`);
}

export async function excluirProcesso(fd: FormData) {
  const u = await exigirUsuario();
  await db.processo.delete({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  revalidatePath("/processos");
  redirect("/processos");
}

export async function adicionarAndamento(fd: FormData) {
  const u = await exigirUsuario();
  const processoId = obrigatorio(fd, "processoId");
  await db.processo.findFirstOrThrow({ where: { id: processoId, escritorioId: u.escritorioId } });
  await db.andamento.create({
    data: { processoId, descricao: obrigatorio(fd, "descricao"), data: data(fd, "data") ?? new Date() },
  });
  revalidatePath(`/processos/${processoId}`);
}

export async function excluirAndamento(fd: FormData) {
  const u = await exigirUsuario();
  const id = obrigatorio(fd, "id");
  const a = await db.andamento.findFirstOrThrow({ where: { id, processo: { escritorioId: u.escritorioId } } });
  await db.andamento.delete({ where: { id } });
  revalidatePath(`/processos/${a.processoId}`);
}

export async function moverEtapa(processoId: string, etapaId: string) {
  const u = await exigirUsuario();
  const etapa = await db.etapa.findFirstOrThrow({ where: { id: etapaId, fase: { escritorioId: u.escritorioId } }, include: { fase: true } });
  await db.processo.update({
    where: { id: processoId, escritorioId: u.escritorioId },
    data: { etapaId, andamentos: { create: { descricao: `Movido para ${etapa.fase.nome} › ${etapa.nome}.` } } },
  });
  revalidatePath("/crm");
}
