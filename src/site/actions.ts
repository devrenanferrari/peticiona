"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export type EstadoContato = { ok?: boolean; erro?: string; campos?: Record<string, string> } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Escritório dono do site: SITE_ESCRITORIO_ID no .env, ou o primeiro cadastrado. */
async function escritorioDoSite() {
  const id = process.env.SITE_ESCRITORIO_ID;
  return id ? db.escritorio.findUnique({ where: { id } }) : db.escritorio.findFirst({ orderBy: { criadoEm: "asc" } });
}

export async function enviarContato(_: EstadoContato, fd: FormData): Promise<EstadoContato> {
  const v = (k: string) => String(fd.get(k) ?? "").trim().slice(0, 2000);
  const campos = { nome: v("nome"), email: v("email"), telefone: v("telefone"), empresa: v("empresa"), area: v("area"), mensagem: v("mensagem") };

  // Campo invisível: robôs costumam preencher; pessoas não.
  if (v("site")) return { ok: true };

  if (campos.nome.length < 3) return { erro: "Informe seu nome completo.", campos };
  if (!EMAIL.test(campos.email)) return { erro: "Informe um e-mail válido.", campos };
  if (campos.telefone.replace(/\D/g, "").length < 10) return { erro: "Informe um telefone com DDD.", campos };
  if (fd.get("consentimento") !== "on") return { erro: "Para continuar, autorize o contato conforme a LGPD.", campos };

  const escritorio = await escritorioDoSite();
  if (!escritorio) return { erro: "Não foi possível enviar agora. Tente pelo WhatsApp.", campos };

  // Evita duplicar o mesmo contato enviado várias vezes em sequência.
  const recente = await db.lead.findFirst({
    where: { escritorioId: escritorio.id, email: campos.email, criadoEm: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  if (recente) return { ok: true };

  const lead = await db.lead.create({
    data: {
      nome: campos.nome,
      email: campos.email.toLowerCase(),
      telefone: campos.telefone || null,
      empresa: campos.empresa || null,
      area: campos.area || null,
      mensagem: campos.mensagem || null,
      consentimento: true,
      origem: "SITE",
      escritorioId: escritorio.id,
    },
  });

  const admin = await db.usuario.findFirst({ where: { escritorioId: escritorio.id, papel: "ADMIN", ativo: true }, orderBy: { criadoEm: "asc" } });
  await db.tarefa.create({
    data: {
      titulo: `Retornar contato do site: ${lead.nome}${lead.empresa ? ` (${lead.empresa})` : ""}`,
      descricao: [lead.area && `Área: ${lead.area}`, `E-mail: ${lead.email}`, lead.telefone && `Telefone: ${lead.telefone}`, lead.mensagem].filter(Boolean).join("\n"),
      tipo: "REUNIAO",
      prioridade: "URGENTE",
      importante: true,
      pontos: 2,
      prazo: new Date(),
      responsavelId: admin?.id,
      criadorId: admin?.id,
      escritorioId: escritorio.id,
    },
  });

  revalidatePath("/leads");
  return { ok: true };
}
