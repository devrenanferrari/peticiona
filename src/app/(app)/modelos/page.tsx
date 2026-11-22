import Link from "next/link";
import { Plus } from "lucide-react";
import { BotaoLink, Cabecalho, Card, Etiqueta, Vazio } from "@/components/kit";
import { filtroCarteira } from "@/lib/acesso";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtData } from "@/lib/format";
import { iaDisponivel } from "@/lib/ia";
import { GeradorIA, GeradorModelo } from "./gerador";

export const metadata = { title: "Modelos e IA" };

export default async function Modelos({ searchParams }: { searchParams: Promise<{ cliente?: string; processo?: string }> }) {
  const { cliente, processo } = await searchParams;
  const u = await exigirUsuario();
  const e = u.escritorioId;
  const [modelos, clientes, processos, documentos] = await Promise.all([
    db.modelo.findMany({ where: { escritorioId: e }, orderBy: [{ categoria: "asc" }, { titulo: "asc" }] }),
    db.cliente.findMany({ where: { escritorioId: e }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    db.processo.findMany({ where: { escritorioId: e, ...(await filtroCarteira(u)) }, orderBy: { titulo: "asc" }, include: { cliente: true } }),
    db.documento.findMany({ where: { escritorioId: e }, orderBy: { atualizadoEm: "desc" }, take: 15, include: { cliente: true } }),
  ]);
  const procOpcoes = processos.map((p) => ({ id: p.id, nome: `${p.titulo} (${p.cliente.nome})`, clienteId: p.clienteId }));

  return (
    <>
      <Cabecalho
        titulo="Modelos e IA"
        subtitulo="Gere petições, contratos e procurações em segundos"
        acoes={
          <BotaoLink href="/modelos/novo">
            <Plus size={16} /> Novo modelo
          </BotaoLink>
        }
      />
      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <GeradorIA clientes={clientes} processos={procOpcoes} cliente={cliente} processo={processo} iaDisponivel={iaDisponivel()} />
        <GeradorModelo modelos={modelos.map((m) => ({ id: m.id, nome: `${m.categoria} · ${m.titulo}` }))} clientes={clientes} processos={procOpcoes} cliente={cliente} processo={processo} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card titulo={`Meus modelos (${modelos.length})`}>
          {modelos.length === 0 ? (
            <Vazio>Nenhum modelo ainda.</Vazio>
          ) : (
            <ul className="divide-y divide-border">
              {modelos.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                  <Link href={`/modelos/${m.id}`} className="text-sm font-medium text-primary hover:underline">
                    {m.titulo}
                  </Link>
                  <span className="flex gap-1">
                    <Etiqueta>{m.categoria}</Etiqueta>
                    {m.area && <Etiqueta cor="azul">{m.area}</Etiqueta>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card titulo="Documentos recentes">
          {documentos.length === 0 ? (
            <Vazio>Nenhum documento gerado.</Vazio>
          ) : (
            <ul className="divide-y divide-border">
              {documentos.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link href={`/documentos/${d.id}`} className="block truncate font-medium text-primary hover:underline">
                      {d.titulo}
                    </Link>
                    <span className="text-xs text-muted-foreground">{fmtData(d.atualizadoEm)}</span>
                  </div>
                  <Etiqueta cor={d.origem === "IA" ? "roxo" : "cinza"}>{d.origem === "IA" ? "IA" : "Modelo"}</Etiqueta>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
