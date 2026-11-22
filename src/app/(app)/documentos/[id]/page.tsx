import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Printer, Save } from "lucide-react";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Botao, Cabecalho, Entrada, Etiqueta } from "@/components/kit";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDataHora } from "@/lib/format";
import { excluirDocumento, salvarDocumento } from "../actions";
import { Imprimir } from "./imprimir";

export default async function Documento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await exigirUsuario();
  const doc = await db.documento.findFirst({ where: { id, escritorioId: u.escritorioId }, include: { cliente: true, processo: true } });
  if (!doc) notFound();
  const pendencias = [...new Set(doc.conteudo.match(/\[\[[\w.]+\]\]|\[[A-ZÀ-Ú0-9 ,./-]{3,}\]/g) ?? [])];

  return (
    <>
      <div className="nao-imprimir">
        <Cabecalho
          titulo={doc.titulo}
          subtitulo={
            <>
              <Etiqueta cor={doc.origem === "IA" ? "roxo" : "cinza"}>{doc.origem === "IA" ? "Gerado por IA" : "Gerado de modelo"}</Etiqueta> · atualizado {fmtDataHora(doc.atualizadoEm)}
              {doc.cliente && (
                <>
                  {" · "}
                  <Link href={`/clientes/${doc.cliente.id}`} className="text-primary hover:underline">
                    {doc.cliente.nome}
                  </Link>
                </>
              )}
              {doc.processo && (
                <>
                  {" · "}
                  <Link href={`/processos/${doc.processo.id}`} className="text-primary hover:underline">
                    {doc.processo.titulo}
                  </Link>
                </>
              )}
            </>
          }
          acoes={
            <>
              <Imprimir />
              <a href={`/documentos/${doc.id}/word`} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted">
                <Download size={16} /> Word (.doc)
              </a>
            </>
          }
        />
        {pendencias.length > 0 && (
          <div className="mb-4 rounded-lg bg-warning/15 p-3 text-sm text-amber-800">
            <b>Revise antes de protocolar:</b> há {pendencias.length} campo(s) para completar — {pendencias.slice(0, 8).join(", ")}
            {pendencias.length > 8 && "..."}
          </div>
        )}
      </div>

      <form action={salvarDocumento} className="space-y-4">
        <input type="hidden" name="id" value={doc.id} />
        <div className="nao-imprimir flex gap-2">
          <Entrada name="titulo" defaultValue={doc.titulo} required className="flex-1" />
          <Botao>
            <Save size={16} /> Salvar
          </Botao>
        </div>
        <textarea
          name="conteudo"
          defaultValue={doc.conteudo}
          className="folha mx-auto block min-h-[80vh] w-full max-w-[21cm] rounded border border-border bg-card px-[2cm] py-[2.5cm] shadow-md outline-none print:hidden"
        />
        {/* Versão para impressão (textarea não imprime bem textos longos) */}
        <div className="folha hidden print:block">{doc.conteudo}</div>
      </form>

      <form action={excluirDocumento} className="nao-imprimir mt-4 flex justify-end">
        <input type="hidden" name="id" value={doc.id} />
        <BotaoConfirmar mensagem="Excluir este documento?" variante="fantasma" className="text-destructive">
          Excluir documento
        </BotaoConfirmar>
      </form>
      <p className="nao-imprimir mt-2 text-center text-xs text-muted-foreground">
        <Printer size={12} className="inline" /> Dica: salve antes de imprimir para que a impressão use o texto mais recente.
      </p>
    </>
  );
}
