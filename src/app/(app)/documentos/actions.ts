"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { obrigatorio } from "@/lib/form";

export async function salvarDocumento(fd: FormData) {
  const u = await exigirUsuario();
  const id = obrigatorio(fd, "id");
  await db.documento.update({
    where: { id, escritorioId: u.escritorioId },
    data: { titulo: obrigatorio(fd, "titulo"), conteudo: String(fd.get("conteudo") ?? "") },
  });
  revalidatePath(`/documentos/${id}`);
}

export async function excluirDocumento(fd: FormData) {
  const u = await exigirUsuario();
  const doc = await db.documento.delete({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  redirect(doc.processoId ? `/processos/${doc.processoId}` : "/modelos");
}
