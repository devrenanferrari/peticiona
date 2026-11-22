import { db } from "./db";

/** Etapa em que um processo novo entra no funil: a primeira da fase "Judicial", se existir; senão, a primeira de todas. */
export async function etapaInicialProcesso(escritorioId: string) {
  const ordem = [{ fase: { ordem: "asc" as const } }, { ordem: "asc" as const }];
  const judicial = await db.etapa.findFirst({ where: { fase: { escritorioId, nome: { contains: "Judicial" } } }, orderBy: ordem });
  return judicial ?? (await db.etapa.findFirst({ where: { fase: { escritorioId } }, orderBy: ordem }));
}
