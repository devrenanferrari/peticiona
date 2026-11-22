"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { exigirAdmin, exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { numero, obrigatorio, texto } from "@/lib/form";

export async function salvarEscritorio(fd: FormData) {
  const u = await exigirAdmin();
  await db.escritorio.update({
    where: { id: u.escritorioId },
    data: {
      nome: obrigatorio(fd, "nome"),
      cnpj: texto(fd, "cnpj"),
      oab: texto(fd, "oab"),
      endereco: texto(fd, "endereco"),
      telefone: texto(fd, "telefone"),
      email: texto(fd, "email"),
    },
  });
  revalidatePath("/", "layout");
}

export async function salvarPerfil(fd: FormData) {
  const u = await exigirUsuario();
  const novaSenha = texto(fd, "senha");
  if (novaSenha && novaSenha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  await db.usuario.update({
    where: { id: u.id },
    data: {
      nome: obrigatorio(fd, "nome"),
      oab: texto(fd, "oab"),
      metaPontos: Math.max(0, Math.trunc(numero(fd, "metaPontos") ?? 0)),
      ...(novaSenha ? { senhaHash: await bcrypt.hash(novaSenha, 10) } : {}),
    },
  });
  revalidatePath("/", "layout");
}

export async function criarUsuario(fd: FormData) {
  const u = await exigirAdmin();
  const email = obrigatorio(fd, "email").toLowerCase();
  const senha = obrigatorio(fd, "senha");
  if (senha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  if (await db.usuario.findUnique({ where: { email } })) throw new Error("Já existe um usuário com esse e-mail.");
  await db.usuario.create({
    data: {
      nome: obrigatorio(fd, "nome"),
      email,
      senhaHash: await bcrypt.hash(senha, 10),
      oab: texto(fd, "oab"),
      papel: texto(fd, "papel") ?? "ADVOGADO",
      carteiraRestrita: fd.get("carteiraRestrita") === "on" && texto(fd, "papel") !== "ADMIN",
      escritorioId: u.escritorioId,
    },
  });
  revalidatePath("/configuracoes");
}

export async function alternarAtivo(fd: FormData) {
  const u = await exigirAdmin();
  const id = obrigatorio(fd, "id");
  if (id === u.id) throw new Error("Você não pode desativar a si mesmo.");
  const alvo = await db.usuario.findFirstOrThrow({ where: { id, escritorioId: u.escritorioId } });
  await db.usuario.update({ where: { id }, data: { ativo: !alvo.ativo } });
  revalidatePath("/configuracoes");
}

/** Liga/desliga a restrição de carteira: o usuário passa a ver só os processos em que é responsável. */
export async function alternarCarteiraRestrita(fd: FormData) {
  const u = await exigirAdmin();
  const alvo = await db.usuario.findFirstOrThrow({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  if (alvo.papel === "ADMIN") throw new Error("Administradores sempre veem a carteira do escritório.");
  await db.usuario.update({ where: { id: alvo.id }, data: { carteiraRestrita: !alvo.carteiraRestrita } });
  revalidatePath("/configuracoes");
}

export async function alterarPapel(fd: FormData) {
  const u = await exigirAdmin();
  const id = obrigatorio(fd, "id");
  if (id === u.id) throw new Error("Você não pode alterar o próprio papel.");
  const papel = obrigatorio(fd, "papel");
  if (!["ADMIN", "ADVOGADO", "ESTAGIARIO", "FINANCEIRO"].includes(papel)) throw new Error("Papel inválido.");
  await db.usuario.findFirstOrThrow({ where: { id, escritorioId: u.escritorioId } });
  await db.usuario.update({ where: { id }, data: { papel, ...(papel === "ADMIN" ? { carteiraRestrita: false } : {}) } });
  revalidatePath("/configuracoes");
}

export async function criarFase(fd: FormData) {
  const u = await exigirAdmin();
  const ordem = await db.fase.count({ where: { escritorioId: u.escritorioId } });
  await db.fase.create({
    data: { nome: obrigatorio(fd, "nome"), ordem, escritorioId: u.escritorioId, etapas: { create: { nome: "Nova etapa", ordem: 0 } } },
  });
  revalidatePath("/configuracoes");
  revalidatePath("/crm");
}

export async function excluirFase(fd: FormData) {
  const u = await exigirAdmin();
  await db.fase.delete({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  revalidatePath("/configuracoes");
  revalidatePath("/crm");
}

export async function criarEtapa(fd: FormData) {
  const u = await exigirAdmin();
  const faseId = obrigatorio(fd, "faseId");
  await db.fase.findFirstOrThrow({ where: { id: faseId, escritorioId: u.escritorioId } });
  const ordem = await db.etapa.count({ where: { faseId } });
  await db.etapa.create({ data: { nome: obrigatorio(fd, "nome"), ordem, faseId } });
  revalidatePath("/configuracoes");
  revalidatePath("/crm");
}

export async function excluirEtapa(fd: FormData) {
  const u = await exigirAdmin();
  const id = obrigatorio(fd, "id");
  await db.etapa.findFirstOrThrow({ where: { id, fase: { escritorioId: u.escritorioId } } });
  await db.etapa.delete({ where: { id } });
  revalidatePath("/configuracoes");
  revalidatePath("/crm");
}

export async function excluirCategoria(fd: FormData) {
  const u = await exigirAdmin();
  await db.categoriaFinanceira.delete({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  revalidatePath("/configuracoes");
}
