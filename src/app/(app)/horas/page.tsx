import { Clock, DollarSign, Receipt, Timer, Trash2 } from "lucide-react";
import { Botao, Cabecalho, Campo, Card, Entrada, Etiqueta, Indicador, Selecao, Tabela, Td, Vazio } from "@/components/kit";
import { filtroCarteira } from "@/lib/acesso";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, fmtData, inputData } from "@/lib/format";
import { excluirHoras, faturarHoras, registrarHoras } from "./actions";
import { Cronometro } from "./cronometro";

export const metadata = { title: "Controle de horas" };

const hm = (min: number) => `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;

export default async function Horas({ searchParams }: { searchParams: Promise<{ meus?: string }> }) {
  const { meus } = await searchParams;
  const u = await exigirUsuario();
  const e = u.escritorioId;
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [registros, clientes, processos, abertos, doMes] = await Promise.all([
    db.registroHoras.findMany({
      where: { escritorioId: e, ...(meus ? { usuarioId: u.id } : {}) },
      include: { usuario: true, cliente: true, processo: true },
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
      take: 100,
    }),
    db.cliente.findMany({ where: { escritorioId: e, categoria: "CLIENTE" }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    db.processo.findMany({ where: { escritorioId: e, status: "ATIVO", ...(await filtroCarteira(u)) }, orderBy: { titulo: "asc" }, include: { cliente: true } }),
    db.registroHoras.findMany({ where: { escritorioId: e, faturavel: true, faturado: false, clienteId: { not: null } }, include: { cliente: true } }),
    db.registroHoras.findMany({ where: { escritorioId: e, data: { gte: inicioMes } }, select: { minutos: true, faturavel: true, usuarioId: true } }),
  ]);

  const porCliente = new Map<string, { nome: string; minutos: number; valor: number }>();
  for (const h of abertos) {
    const atual = porCliente.get(h.clienteId!) ?? { nome: h.cliente!.nome, minutos: 0, valor: 0 };
    atual.minutos += h.minutos;
    atual.valor += (h.minutos / 60) * (h.valorHora ?? 0);
    porCliente.set(h.clienteId!, atual);
  }
  const totalMes = doMes.reduce((s, h) => s + h.minutos, 0);
  const faturavelMes = doMes.filter((h) => h.faturavel).reduce((s, h) => s + h.minutos, 0);
  const meusMes = doMes.filter((h) => h.usuarioId === u.id).reduce((s, h) => s + h.minutos, 0);
  const aFaturar = [...porCliente.values()].reduce((s, c) => s + c.valor, 0);

  return (
    <>
      <Cabecalho titulo="Controle de horas" subtitulo="Timesheet da equipe, com faturamento das horas por cliente" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="Horas no mês (equipe)" valor={hm(totalMes)} icone={Clock} />
        <Indicador rotulo="Minhas horas no mês" valor={hm(meusMes)} icone={Timer} />
        <Indicador rotulo="Faturáveis no mês" valor={totalMes ? `${Math.round((faturavelMes / totalMes) * 100)}%` : "—"} icone={Receipt} detalhe={`${hm(faturavelMes)} faturáveis`} />
        <Indicador rotulo="A faturar" valor={brl(aFaturar)} icone={DollarSign} tom="sucesso" detalhe={`${porCliente.size} cliente(s) com horas em aberto`} />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card titulo="Registrar horas">
          <div className="mb-5">
            <Cronometro alvo="duracao" />
          </div>
          <form action={registrarHoras} className="grid gap-4 md:grid-cols-4">
            <Campo rotulo="Data">
              <Entrada type="date" name="data" defaultValue={inputData(new Date())} />
            </Campo>
            <Campo rotulo="Duração *" dica="Ex.: 1:30, 2h, 45min">
              <Entrada id="duracao" name="duracao" required placeholder="1:30" />
            </Campo>
            <Campo rotulo="Valor-hora (R$)">
              <Entrada name="valorHora" inputMode="decimal" defaultValue={u.valorHora ?? ""} placeholder="450,00" />
            </Campo>
            <label className="flex items-end gap-2 pb-2.5 text-sm">
              <input type="checkbox" name="faturavel" defaultChecked /> Faturável
            </label>
            <Campo rotulo="Cliente" className="md:col-span-2">
              <Selecao name="clienteId" vazio="—" opcoes={clientes.map((c) => [c.id, c.nome])} />
            </Campo>
            <Campo rotulo="Processo (opcional)" className="md:col-span-2">
              <Selecao name="processoId" vazio="—" opcoes={processos.map((p) => [p.id, `${p.titulo} (${p.cliente.nome})`])} />
            </Campo>
            <Campo rotulo="O que foi feito *" className="md:col-span-4">
              <Entrada name="descricao" required placeholder="Ex.: Revisão do contrato de fornecimento e reunião com o jurídico do cliente" />
            </Campo>
            <div className="flex justify-end md:col-span-4">
              <Botao>Registrar</Botao>
            </div>
          </form>
        </Card>

        <Card titulo="Horas em aberto por cliente" descricao="Gere a cobrança com um clique">
          {porCliente.size === 0 ? (
            <Vazio icone={Receipt}>Nenhuma hora faturável pendente.</Vazio>
          ) : (
            <ul className="divide-y">
              {[...porCliente.entries()].map(([id, c]) => (
                <li key={id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.nome}</p>
                    <p className="tabular text-xs text-muted-foreground">
                      {hm(c.minutos)} · {brl(c.valor)}
                    </p>
                  </div>
                  <form action={faturarHoras}>
                    <input type="hidden" name="clienteId" value={id} />
                    <Botao variante="secundario" className="h-8" disabled={c.valor <= 0}>
                      Faturar
                    </Botao>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lançamentos recentes</h2>
        <nav className="flex gap-1 rounded-lg border bg-muted/50 p-1 text-sm">
          <a href="/horas" className={`rounded-md px-3 py-1 ${!meus ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Equipe</a>
          <a href="/horas?meus=1" className={`rounded-md px-3 py-1 ${meus ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Minhas</a>
        </nav>
      </div>
      {registros.length === 0 ? (
        <Vazio icone={Clock}>Nenhuma hora registrada ainda. Use o cronômetro acima para começar.</Vazio>
      ) : (
        <Tabela colunas={["Data", "Atividade", "Cliente", "Profissional", "Duração", "Valor", ""]}>
          {registros.map((h) => (
            <tr key={h.id} className="group">
              <Td className="whitespace-nowrap text-muted-foreground">{fmtData(h.data)}</Td>
              <Td>
                <p>{h.descricao}</p>
                {h.processo && <p className="text-xs text-muted-foreground">{h.processo.titulo}</p>}
              </Td>
              <Td className="text-muted-foreground">{h.cliente?.nome ?? "Interno"}</Td>
              <Td className="whitespace-nowrap text-muted-foreground">{h.usuario.nome}</Td>
              <Td className="tabular font-medium">{hm(h.minutos)}</Td>
              <Td className="whitespace-nowrap">
                {!h.faturavel ? (
                  <Etiqueta>Não faturável</Etiqueta>
                ) : h.faturado ? (
                  <Etiqueta cor="verde">Faturado</Etiqueta>
                ) : (
                  <span className="tabular">{h.valorHora ? brl((h.minutos / 60) * h.valorHora) : "—"}</span>
                )}
              </Td>
              <Td className="w-8">
                {!h.faturado && (
                  <form action={excluirHoras} className="opacity-0 transition-opacity group-hover:opacity-100">
                    <input type="hidden" name="id" value={h.id} />
                    <button aria-label="Excluir registro" className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                )}
              </Td>
            </tr>
          ))}
        </Tabela>
      )}
    </>
  );
}
