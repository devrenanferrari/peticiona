"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { obrigatorio, texto } from "@/lib/form";
import { gerarPecaComIA } from "@/lib/ia";
import { preencherModelo } from "@/lib/modelos";

export async function salvarModelo(fd: FormData) {
  const u = await exigirUsuario();
  const id = texto(fd, "id");
  const dados = {
    titulo: obrigatorio(fd, "titulo"),
    categoria: texto(fd, "categoria") ?? "Petição",
    area: texto(fd, "area"),
    conteudo: obrigatorio(fd, "conteudo"),
  };
  if (id) await db.modelo.update({ where: { id, escritorioId: u.escritorioId }, data: dados });
  else await db.modelo.create({ data: { ...dados, escritorioId: u.escritorioId } });
  revalidatePath("/modelos");
  redirect("/modelos");
}

export async function excluirModelo(fd: FormData) {
  const u = await exigirUsuario();
  await db.modelo.delete({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  revalidatePath("/modelos");
  redirect("/modelos");
}

async function carregarContexto(escritorioId: string, clienteId: string | null, processoId: string | null) {
  const processo = processoId ? await db.processo.findFirst({ where: { id: processoId, escritorioId }, include: { responsavel: true } }) : null;
  const cliente = await db.cliente.findFirst({ where: { id: clienteId ?? processo?.clienteId ?? "", escritorioId } });
  return { processo, cliente };
}

/** Gera um documento a partir de um modelo, preenchendo as variáveis. */
export async function gerarDeModelo(fd: FormData) {
  const u = await exigirUsuario();
  const modelo = await db.modelo.findFirstOrThrow({ where: { id: obrigatorio(fd, "modeloId"), escritorioId: u.escritorioId } });
  const { processo, cliente } = await carregarContexto(u.escritorioId, texto(fd, "clienteId"), texto(fd, "processoId"));
  const doc = await db.documento.create({
    data: {
      titulo: `${modelo.titulo}${cliente ? ` – ${cliente.nome}` : ""}`,
      conteudo: preencherModelo(modelo.conteudo, { cliente, processo, escritorio: u.escritorio, advogado: processo?.responsavel ?? u }),
      origem: "MODELO",
      modeloId: modelo.id,
      clienteId: cliente?.id,
      processoId: processo?.id,
      escritorioId: u.escritorioId,
    },
  });
  revalidatePath("/modelos");
  redirect(`/documentos/${doc.id}`);
}

export type EstadoIA = { erro?: string } | undefined;

/** Gera uma peça com IA usando os dados do cliente/processo e as instruções do advogado. */
export async function gerarComIA(_: EstadoIA, fd: FormData): Promise<EstadoIA> {
  const u = await exigirUsuario();
  const tipoPeca = texto(fd, "tipoPeca");
  if (!tipoPeca) return { erro: "Informe o tipo de peça." };
  const { processo, cliente } = await carregarContexto(u.escritorioId, texto(fd, "clienteId"), texto(fd, "processoId"));

  let conteudo: string;
  try {
    conteudo = await gerarPecaComIA({
      tipoPeca,
      instrucoes: texto(fd, "instrucoes") ?? "",
      contexto: { cliente, processo, escritorio: u.escritorio, advogado: processo?.responsavel ?? u },
    });
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Falha ao gerar a peça." };
  }

  const doc = await db.documento.create({
    data: {
      titulo: `${tipoPeca}${cliente ? ` – ${cliente.nome}` : ""}`,
      conteudo,
      origem: "IA",
      clienteId: cliente?.id,
      processoId: processo?.id,
      escritorioId: u.escritorioId,
    },
  });
  revalidatePath("/modelos");
  redirect(`/documentos/${doc.id}`);
}
