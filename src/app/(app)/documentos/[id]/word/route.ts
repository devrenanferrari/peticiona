import { usuarioAtual } from "@/lib/auth";
import { db } from "@/lib/db";

const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Exporta o documento em HTML compatível com o Word (abre direto como .doc). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioAtual();
  if (!u) return new Response("Não autorizado", { status: 401 });
  const { id } = await params;
  const doc = await db.documento.findFirst({ where: { id, escritorioId: u.escritorioId } });
  if (!doc) return new Response("Não encontrado", { status: 404 });

  const paragrafos = doc.conteudo
    .split(/\n/)
    .map((linha) => `<p>${escapar(linha) || "&nbsp;"}</p>`)
    .join("\n");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapar(doc.titulo)}</title>
<style>
@page { size: 21cm 29.7cm; margin: 3cm 2cm 2cm 3cm; }
body { font-family: "Times New Roman", serif; font-size: 12pt; }
p { margin: 0; line-height: 1.5; text-align: justify; }
</style></head><body>${paragrafos}</body></html>`;

  const nome = doc.titulo.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w -]+/g, "").trim() || "documento";
  return new Response("﻿" + html, {
    headers: {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}.doc"`,
    },
  });
}
