import Link from "next/link";
import { Plus } from "lucide-react";
import { BotaoLink, Busca, Cabecalho, Etiqueta, Tabela, Td, Vazio } from "@/components/kit";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDocumento } from "@/lib/format";

export const metadata = { title: "Contatos" };

const CATEGORIAS: Record<string, string> = { CLIENTE: "Cliente", PARTE_CONTRARIA: "Parte contrária", TESTEMUNHA: "Testemunha", OUTRO: "Outro" };

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string }> }) {
  const { q, categoria } = await searchParams;
  const u = await exigirUsuario();
  const clientes = await db.cliente.findMany({
    where: {
      escritorioId: u.escritorioId,
      ...(categoria ? { categoria } : {}),
      ...(q ? { OR: [{ nome: { contains: q } }, { documento: { contains: q.replace(/\D/g, "") || q } }, { email: { contains: q } }] } : {}),
    },
    include: { _count: { select: { processos: true } } },
    orderBy: { nome: "asc" },
  });

  return (
    <>
      <Cabecalho
        titulo="Contatos"
        subtitulo={`${clientes.length} contato(s)`}
        acoes={
          <BotaoLink href="/clientes/novo">
            <Plus size={16} /> Novo contato
          </BotaoLink>
        }
      />
      <Busca valor={q} placeholder="Nome, CPF/CNPJ ou e-mail">
        <select name="categoria" defaultValue={categoria ?? ""} className="campo max-w-48">
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORIAS).map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </select>
      </Busca>
      {clientes.length === 0 ? (
        <Vazio>Nenhum contato encontrado.</Vazio>
      ) : (
        <Tabela colunas={["Nome", "CPF/CNPJ", "Contato", "Cidade", "Categoria", "Processos"]}>
          {clientes.map((c) => (
            <tr key={c.id} className="hover:bg-muted">
              <Td>
                <Link href={`/clientes/${c.id}`} className="font-medium text-primary hover:underline">
                  {c.nome}
                </Link>
              </Td>
              <Td className="text-muted-foreground">{fmtDocumento(c.documento) || "—"}</Td>
              <Td className="text-muted-foreground">{c.celular ?? c.telefone ?? c.email ?? "—"}</Td>
              <Td className="text-muted-foreground">{c.cidade ? `${c.cidade}/${c.uf ?? ""}` : "—"}</Td>
              <Td>
                <Etiqueta cor={c.categoria === "CLIENTE" ? "azul" : "cinza"}>{CATEGORIAS[c.categoria]}</Etiqueta>
              </Td>
              <Td>{c._count.processos}</Td>
            </tr>
          ))}
        </Tabela>
      )}
    </>
  );
}
