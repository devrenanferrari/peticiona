import { revalidatePath } from "next/cache";
import { Trash2 } from "lucide-react";
import { Botao, Cabecalho, Campo, Card, Entrada, Tabela, Td, Vazio } from "@/components/kit";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { numero, obrigatorio, texto } from "@/lib/form";

export const metadata = { title: "Parceiros" };

async function salvarParceiro(fd: FormData) {
  "use server";
  const u = await exigirUsuario();
  await db.parceiro.create({
    data: {
      nome: obrigatorio(fd, "nome"),
      oab: texto(fd, "oab"),
      email: texto(fd, "email"),
      telefone: texto(fd, "telefone"),
      cidade: texto(fd, "cidade"),
      uf: texto(fd, "uf")?.toUpperCase(),
      areas: texto(fd, "areas"),
      percentual: numero(fd, "percentual"),
      escritorioId: u.escritorioId,
    },
  });
  revalidatePath("/parceiros");
}

async function excluirParceiro(fd: FormData) {
  "use server";
  const u = await exigirUsuario();
  await db.parceiro.delete({ where: { id: obrigatorio(fd, "id"), escritorioId: u.escritorioId } });
  revalidatePath("/parceiros");
}

export default async function Parceiros() {
  const u = await exigirUsuario();
  const parceiros = await db.parceiro.findMany({ where: { escritorioId: u.escritorioId }, orderBy: { nome: "asc" } });
  return (
    <>
      <Cabecalho titulo="Parceiros" subtitulo="Correspondentes e advogados parceiros, com percentual de repasse" />
      <Card titulo="Novo parceiro" className="mb-6">
        <form action={salvarParceiro} className="grid gap-3 md:grid-cols-4">
          <Campo rotulo="Nome *" className="md:col-span-2">
            <Entrada name="nome" required />
          </Campo>
          <Campo rotulo="OAB">
            <Entrada name="oab" />
          </Campo>
          <Campo rotulo="Repasse (%)">
            <Entrada name="percentual" inputMode="decimal" />
          </Campo>
          <Campo rotulo="E-mail">
            <Entrada name="email" type="email" />
          </Campo>
          <Campo rotulo="Telefone">
            <Entrada name="telefone" />
          </Campo>
          <Campo rotulo="Cidade">
            <Entrada name="cidade" />
          </Campo>
          <Campo rotulo="UF">
            <Entrada name="uf" maxLength={2} />
          </Campo>
          <Campo rotulo="Áreas de atuação" className="md:col-span-3">
            <Entrada name="areas" placeholder="Ex.: Trabalhista, audiências em Campinas" />
          </Campo>
          <div className="flex items-end">
            <Botao className="w-full">Adicionar</Botao>
          </div>
        </form>
      </Card>
      {parceiros.length === 0 ? (
        <Vazio>Nenhum parceiro cadastrado.</Vazio>
      ) : (
        <Tabela colunas={["Nome", "OAB", "Contato", "Local", "Áreas", "Repasse", ""]}>
          {parceiros.map((p) => (
            <tr key={p.id}>
              <Td className="font-medium">{p.nome}</Td>
              <Td>{p.oab ?? "—"}</Td>
              <Td className="text-muted-foreground">{[p.email, p.telefone].filter(Boolean).join(" · ") || "—"}</Td>
              <Td className="text-muted-foreground">{p.cidade ? `${p.cidade}/${p.uf ?? ""}` : "—"}</Td>
              <Td className="text-muted-foreground">{p.areas ?? "—"}</Td>
              <Td>{p.percentual != null ? `${p.percentual}%` : "—"}</Td>
              <Td>
                <form action={excluirParceiro}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="text-muted-foreground hover:text-destructive" title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </form>
              </Td>
            </tr>
          ))}
        </Tabela>
      )}
    </>
  );
}
