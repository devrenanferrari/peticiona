"use server";

import { db } from "@/lib/db";
import { IDS } from "./catalogo";

/** Soma 1 ao uso do dia da ferramenta. Anônimo: não recebe nem grava dado de quem usou. */
export async function registrarUso(ferramenta: string) {
  if (!IDS.has(ferramenta)) return;
  const d = new Date();
  const dia = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  try {
    await db.usoFerramenta.upsert({
      where: { ferramenta_dia: { ferramenta, dia } },
      create: { ferramenta, dia, total: 1 },
      update: { total: { increment: 1 } },
    });
  } catch {
    // A contagem é só um indicador: nunca deve atrapalhar quem está usando a ferramenta.
  }
}
