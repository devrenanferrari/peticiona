"use server";

import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { data, obrigatorio, texto } from "@/lib/form";

const CNJ = /\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/;

export async function salvarIntimacao(fd: FormData) {
  const u = await exigirUsuario();
  const conteudo = obrigatorio(fd, "conteudo");
  // Tenta achar o número CNJ no texto e vincular ao processo cadastrado.
  const numero = (texto(fd, "numeroProcesso") ?? conteudo.match(CNJ)?.[0] ?? "").replace(/\D/g, "") || null;
  const processo = numero ? await db.processo.findFirst({ where: { escritorioId: u.escritorioId, numero } }) : null;
  const prazoFatal = data(fd, "prazoFatal");

  const intimacao = await db.intimacao.create({
    data: {
      conteudo,
      dataPublicacao: data(fd, "dataPublicacao") ?? new Date(),
      diario: texto(fd, "diario"),
      numeroProcesso: numero,
      prazoFatal,
      processoId: processo?.id,
      escritorioId: u.escritorioId,
    },
  });

  // Prazo informado vira tarefa para o responsável pelo processo.
  if (prazoFatal) {
    await db.tarefa.create({
      data: {
        titulo: `Prazo: intimação de ${intimacao.dataPublicacao.toLocaleDateString("pt-BR")}${processo ? ` – ${processo.titulo}` : ""}`,
        descricao: conteudo.slice(0, 1000),
        tipo: "PRAZO",
        prioridade: "URGENTE",
        importante: true,
        pontos: 3,
        prazo: prazoFatal,
        processoId: processo?.id,
        responsavelId: processo?.responsavelId ?? u.id,
        criadorId: u.id,
        escritorioId: u.escritorioId,
      },
    });
  }
  revalidatePath("/intimacoes");
}

export async function alternarLida(fd: FormData) {
  const u = await exigirUsuario();
  const id = obrigatorio(fd, "id");
  const i = await db.intimacao.findFirstOrThrow({ where: { id, escritorioId: u.escritorioId } });
  await db.intimacao.update({ where: { id }, data: { lida: !i.lida } });
  revalidatePath("/intimacoes");
}

export async function excluirIntimacao(fd: FormData) {
  const u = await exigirUsuario();
  await db.intimacao.delete({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  revalidatePath("/intimacoes");
}
