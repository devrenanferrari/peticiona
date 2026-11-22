"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { data, obrigatorio, texto } from "@/lib/form";

function dadosCliente(fd: FormData) {
  return {
    tipo: texto(fd, "tipo") ?? "PF",
    categoria: texto(fd, "categoria") ?? "CLIENTE",
    nome: obrigatorio(fd, "nome"),
    documento: texto(fd, "documento")?.replace(/\D/g, "") || null,
    rg: texto(fd, "rg"),
    nacionalidade: texto(fd, "nacionalidade"),
    estadoCivil: texto(fd, "estadoCivil"),
    profissao: texto(fd, "profissao"),
    nascimento: data(fd, "nascimento"),
    email: texto(fd, "email"),
    telefone: texto(fd, "telefone"),
    celular: texto(fd, "celular"),
    cep: texto(fd, "cep"),
    endereco: texto(fd, "endereco"),
    numero: texto(fd, "numero"),
    complemento: texto(fd, "complemento"),
    bairro: texto(fd, "bairro"),
    cidade: texto(fd, "cidade"),
    uf: texto(fd, "uf")?.toUpperCase() ?? null,
    origem: texto(fd, "origem"),
    observacoes: texto(fd, "observacoes"),
  };
}

export async function salvarCliente(fd: FormData) {
  const u = await exigirUsuario();
  const id = texto(fd, "id");
  let clienteId = id;
  if (id) {
    await db.cliente.update({ where: { id, escritorioId: u.escritorioId }, data: dadosCliente(fd) });
  } else {
    const c = await db.cliente.create({ data: { ...dadosCliente(fd), escritorioId: u.escritorioId } });
    clienteId = c.id;
  }
  revalidatePath("/clientes");
  redirect(`/clientes/${clienteId}`);
}

export async function excluirCliente(fd: FormData) {
  const u = await exigirUsuario();
  await db.cliente.delete({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  revalidatePath("/clientes");
  redirect("/clientes");
}
