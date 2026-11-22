"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { criarSessao, encerrarSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { PERMITIR_CADASTRO } from "@/marca";

export type EstadoLogin = { erro?: string } | undefined;

export async function entrar(_: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const senha = String(fd.get("senha") ?? "");
  const usuario = await db.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.ativo || !(await bcrypt.compare(senha, usuario.senhaHash))) {
    return { erro: "E-mail ou senha inválidos." };
  }
  await criarSessao(usuario.id);
  redirect("/painel");
}

export async function cadastrarEscritorio(_: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  if (!PERMITIR_CADASTRO) return { erro: "O cadastro de novos escritórios está desativado." };
  const escritorio = String(fd.get("escritorio") ?? "").trim();
  const nome = String(fd.get("nome") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const senha = String(fd.get("senha") ?? "");
  if (!escritorio || !nome || !email) return { erro: "Preencha todos os campos." };
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (await db.usuario.findUnique({ where: { email } })) return { erro: "Já existe uma conta com esse e-mail." };

  const novo = await db.escritorio.create({
    data: {
      nome: escritorio,
      usuarios: { create: { nome, email, senhaHash: await bcrypt.hash(senha, 10), papel: "ADMIN" } },
      contas: { create: [{ nome: "Conta Principal" }, { nome: "Dinheiro" }, { nome: "Investimentos" }] },
      categorias: {
        create: [
          ...["Honorários contratuais", "Honorários de êxito", "Honorários de sucumbência", "Consultoria"].map((n) => ({ nome: n, tipo: "RECEITA" })),
          ...["Aluguel", "Salários", "Custas processuais", "Impostos", "Outras despesas"].map((n) => ({ nome: n, tipo: "DESPESA" })),
        ],
      },
      fases: {
        create: [
          { nome: "Negociação", ordem: 0, etapas: { create: ["Primeiro contato", "Proposta enviada", "Contrato assinado"].map((n, i) => ({ nome: n, ordem: i })) } },
          { nome: "Judicial", ordem: 1, etapas: { create: ["Petição inicial", "Citação", "Instrução", "Sentença"].map((n, i) => ({ nome: n, ordem: i })) } },
          { nome: "Recursal", ordem: 2, etapas: { create: ["Recurso interposto", "Julgamento"].map((n, i) => ({ nome: n, ordem: i })) } },
          { nome: "Execução", ordem: 3, etapas: { create: ["Cumprimento de sentença", "Alvará"].map((n, i) => ({ nome: n, ordem: i })) } },
          { nome: "Arquivamento", ordem: 4, etapas: { create: [{ nome: "Arquivado", ordem: 0 }] } },
        ],
      },
    },
    include: { usuarios: true },
  });
  await criarSessao(novo.usuarios[0].id);
  redirect("/painel");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}
