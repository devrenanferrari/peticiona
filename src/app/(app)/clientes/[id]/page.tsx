import Link from "next/link";
import { notFound } from "next/navigation";
import { FilePlus, FolderPlus, Trash2 } from "lucide-react";
import { BotaoLink, Cabecalho, Card, Vazio, StatusProcesso } from "@/components/kit";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, fmtCNJ, fmtData, fmtDocumento } from "@/lib/format";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { excluirCliente } from "../actions";
import { FormCliente } from "../form-cliente";

export default async function DetalheCliente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ editar?: string }> }) {
  const { id } = await params;
  const { editar } = await searchParams;
  const u = await exigirUsuario();
  const cliente = await db.cliente.findFirst({
    where: { id, escritorioId: u.escritorioId },
    include: {
      processos: { orderBy: { criadoEm: "desc" } },
      lancamentos: { orderBy: { vencimento: "desc" }, take: 10 },
      documentos: { orderBy: { criadoEm: "desc" }, take: 10 },
    },
  });
  if (!cliente) notFound();

  if (editar) {
    return (
      <>
        <Cabecalho titulo={`Editar: ${cliente.nome}`} />
        <FormCliente cliente={cliente} />
      </>
    );
  }

  const aReceber = cliente.lancamentos.filter((l) => l.tipo === "RECEITA" && !l.pagamento).reduce((s, l) => s + l.valor, 0);

  return (
    <>
      <Cabecalho
        titulo={cliente.nome}
        subtitulo={[cliente.tipo === "PF" ? "Pessoa física" : "Pessoa jurídica", fmtDocumento(cliente.documento)].filter(Boolean).join(" · ")}
        acoes={
          <>
            <BotaoLink variante="secundario" href={`/processos/novo?cliente=${cliente.id}`}>
              <FolderPlus size={16} /> Novo processo
            </BotaoLink>
            <BotaoLink variante="secundario" href={`/modelos?cliente=${cliente.id}`}>
              <FilePlus size={16} /> Gerar documento
            </BotaoLink>
            <BotaoLink href={`/clientes/${cliente.id}?editar=1`}>Editar</BotaoLink>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card titulo="Dados" className="lg:col-span-1">
          <dl className="space-y-2 text-sm">
            {[
              ["E-mail", cliente.email],
              ["Celular", cliente.celular],
              ["Telefone", cliente.telefone],
              ["RG", cliente.rg],
              ["Nascimento", cliente.nascimento ? fmtData(cliente.nascimento) : null],
              ["Estado civil", cliente.estadoCivil],
              ["Profissão", cliente.profissao],
              ["Endereço", [cliente.endereco, cliente.numero, cliente.bairro, cliente.cidade && `${cliente.cidade}/${cliente.uf}`].filter(Boolean).join(", ")],
              ["Origem", cliente.origem],
            ].map(([r, v]) => (
              <div key={r} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{r}</dt>
                <dd className="text-right">{v || "—"}</dd>
              </div>
            ))}
          </dl>
          {cliente.observacoes && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">{cliente.observacoes}</p>}
          {cliente.celular && (
            <a
              className="mt-4 block text-sm text-success hover:underline"
              href={`https://wa.me/55${cliente.celular.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir conversa no WhatsApp →
            </a>
          )}
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card titulo={`Processos (${cliente.processos.length})`}>
            {cliente.processos.length === 0 ? (
              <Vazio>Nenhum processo para este contato.</Vazio>
            ) : (
              <ul className="divide-y divide-border">
                {cliente.processos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <Link href={`/processos/${p.id}`} className="font-medium text-primary hover:underline">
                        {p.titulo}
                      </Link>
                      <p className="text-xs text-muted-foreground">{fmtCNJ(p.numero) || "Sem número"} · {p.area ?? "—"}</p>
                    </div>
                    <StatusProcesso status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card titulo="Financeiro" acoes={<span className="text-sm text-muted-foreground">A receber: <b className="text-foreground">{brl(aReceber)}</b></span>}>
            {cliente.lancamentos.length === 0 ? (
              <Vazio>Sem lançamentos.</Vazio>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {cliente.lancamentos.map((l) => (
                  <li key={l.id} className="flex justify-between py-2">
                    <span>
                      {l.descricao} <span className="text-muted-foreground">· vence {fmtData(l.vencimento)}</span>
                    </span>
                    <span className={l.tipo === "RECEITA" ? "text-success" : "text-destructive"}>
                      {brl(l.valor)} {l.pagamento ? "✓" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card titulo="Documentos gerados">
            {cliente.documentos.length === 0 ? (
              <Vazio>Nenhum documento gerado.</Vazio>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {cliente.documentos.map((d) => (
                  <li key={d.id} className="py-2">
                    <Link href={`/documentos/${d.id}`} className="text-primary hover:underline">
                      {d.titulo}
                    </Link>
                    <span className="text-muted-foreground"> · {fmtData(d.criadoEm)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <form action={excluirCliente} className="flex justify-end">
            <input type="hidden" name="id" value={cliente.id} />
            <BotaoConfirmar mensagem="Excluir este contato e todos os processos dele?" variante="fantasma" className="text-destructive">
              <Trash2 size={16} /> Excluir contato (e seus processos)
            </BotaoConfirmar>
          </form>
        </div>
      </div>
    </>
  );
}
