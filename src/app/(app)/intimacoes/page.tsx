import Link from "next/link";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { AreaTexto, Botao, Cabecalho, Campo, Card, Entrada, Etiqueta, Vazio, cx } from "@/components/kit";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtCNJ, fmtData, inputData } from "@/lib/format";
import { alternarLida, excluirIntimacao, salvarIntimacao } from "./actions";

export const metadata = { title: "Intimações" };

export default async function Intimacoes({ searchParams }: { searchParams: Promise<{ todas?: string }> }) {
  const { todas } = await searchParams;
  const u = await exigirUsuario();
  const intimacoes = await db.intimacao.findMany({
    where: { escritorioId: u.escritorioId, ...(todas ? {} : { lida: false }) },
    include: { processo: { include: { cliente: true } } },
    orderBy: { dataPublicacao: "desc" },
    take: 200,
  });

  return (
    <>
      <Cabecalho titulo="Intimações" subtitulo="Publicações dos diários oficiais e prazos" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card titulo="Registrar publicação" className="h-fit">
          <form action={salvarIntimacao} className="space-y-3">
            <Campo rotulo="Texto da publicação *" dica="Se o número CNJ estiver no texto, o processo é vinculado automaticamente.">
              <AreaTexto name="conteudo" rows={7} required />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Publicada em">
                <Entrada type="date" name="dataPublicacao" defaultValue={inputData(new Date())} />
              </Campo>
              <Campo rotulo="Diário">
                <Entrada name="diario" placeholder="DJE, DEJT..." />
              </Campo>
            </div>
            <Campo rotulo="Nº do processo (opcional)">
              <Entrada name="numeroProcesso" />
            </Campo>
            <Campo rotulo="Prazo fatal" dica="Cria automaticamente uma tarefa urgente.">
              <Entrada type="date" name="prazoFatal" />
            </Campo>
            <Botao className="w-full">Registrar</Botao>
          </form>
        </Card>

        <div className="lg:col-span-2">
          <div className="mb-3 flex gap-2 text-sm">
            <Link href="/intimacoes" className={cx("rounded-full px-3 py-1", !todas ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-border")}>
              Não lidas
            </Link>
            <Link href="/intimacoes?todas=1" className={cx("rounded-full px-3 py-1", todas ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-border")}>
              Todas
            </Link>
          </div>
          {intimacoes.length === 0 ? (
            <Vazio>Nenhuma intimação {todas ? "" : "não lida"}.</Vazio>
          ) : (
            <ul className="space-y-3">
              {intimacoes.map((i) => (
                <li key={i.id} className={cx("rounded-xl border bg-card p-4 shadow-sm", i.lida ? "border-border opacity-70" : "border-warning/50")}>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <b className="text-foreground">{fmtData(i.dataPublicacao)}</b>
                    {i.diario && <Etiqueta>{i.diario}</Etiqueta>}
                    {i.prazoFatal && <Etiqueta cor="vermelho">Prazo: {fmtData(i.prazoFatal)}</Etiqueta>}
                    {i.processo ? (
                      <Link href={`/processos/${i.processo.id}`} className="text-primary hover:underline">
                        {i.processo.titulo} ({i.processo.cliente.nome})
                      </Link>
                    ) : (
                      i.numeroProcesso && <span className="font-mono">{fmtCNJ(i.numeroProcesso)} (não cadastrado)</span>
                    )}
                    <span className="ml-auto flex gap-2">
                      <form action={alternarLida}>
                        <input type="hidden" name="id" value={i.id} />
                        <button title={i.lida ? "Marcar como não lida" : "Marcar como lida"} className="hover:text-primary">
                          {i.lida ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </form>
                      <form action={excluirIntimacao}>
                        <input type="hidden" name="id" value={i.id} />
                        <button title="Excluir" className="hover:text-destructive">
                          <Trash2 size={16} />
                        </button>
                      </form>
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{i.conteudo}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
