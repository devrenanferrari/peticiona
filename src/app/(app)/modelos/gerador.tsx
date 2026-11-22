"use client";

import { useActionState, useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { AreaTexto, Botao, Campo, Card, Entrada, Selecao } from "@/components/kit";
import { gerarComIA, gerarDeModelo } from "./actions";

type Opcao = { id: string; nome: string };
type ProcessoOpcao = { id: string; nome: string; clienteId: string };

const PECAS = [
  "Petição inicial",
  "Contestação",
  "Réplica",
  "Recurso de apelação",
  "Agravo de instrumento",
  "Embargos de declaração",
  "Recurso ordinário trabalhista",
  "Reclamação trabalhista",
  "Mandado de segurança",
  "Habeas corpus",
  "Notificação extrajudicial",
  "Parecer jurídico",
  "Contrato",
  "Acordo extrajudicial",
];

/** Seletor de cliente + processo (processos filtrados pelo cliente escolhido). */
function SeletorContexto({ clientes, processos, cliente, processo }: { clientes: Opcao[]; processos: ProcessoOpcao[]; cliente?: string; processo?: string }) {
  const [clienteId, setClienteId] = useState(cliente ?? processos.find((p) => p.id === processo)?.clienteId ?? "");
  const lista = clienteId ? processos.filter((p) => p.clienteId === clienteId) : processos;
  return (
    <>
      <Campo rotulo="Cliente">
        <Selecao name="clienteId" value={clienteId} onChange={(e) => setClienteId(e.target.value)} vazio="—" opcoes={clientes.map((c) => [c.id, c.nome])} />
      </Campo>
      <Campo rotulo="Processo">
        <Selecao key={clienteId} name="processoId" defaultValue={processo ?? ""} vazio="—" opcoes={lista.map((p) => [p.id, p.nome])} />
      </Campo>
    </>
  );
}

export function GeradorIA(p: { clientes: Opcao[]; processos: ProcessoOpcao[]; cliente?: string; processo?: string; iaDisponivel: boolean }) {
  const [estado, acao, gerando] = useActionState(gerarComIA, undefined);
  return (
    <Card
      titulo={
        <span className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" /> Gerar peça com IA
        </span>
      }
    >
      {!p.iaDisponivel && (
        <p className="mb-4 rounded-lg bg-warning/15 p-3 text-sm text-amber-800">
          Para ativar, coloque sua chave da Anthropic em <code>ANTHROPIC_API_KEY</code> no arquivo <code>.env</code> e reinicie o servidor.
        </p>
      )}
      <form action={acao} className="grid gap-4 md:grid-cols-2">
        <Campo rotulo="Tipo de peça *" className="md:col-span-2">
          <Entrada name="tipoPeca" list="pecas" required placeholder="Ex.: Contestação" />
          <datalist id="pecas">
            {PECAS.map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
        </Campo>
        <SeletorContexto {...p} />
        <Campo rotulo="Fatos e instruções" className="md:col-span-2" dica="Quanto mais detalhes (fatos, datas, valores, teses), melhor a minuta.">
          <AreaTexto name="instrucoes" rows={6} placeholder="Descreva o caso, as teses que quer usar e os pedidos..." />
        </Campo>
        {estado?.erro && <p className="text-sm text-destructive md:col-span-2">{estado.erro}</p>}
        <div className="flex items-center justify-end gap-3 md:col-span-2">
          {gerando && <span className="text-sm text-muted-foreground">Redigindo a peça, isso pode levar alguns minutos...</span>}
          <Botao disabled={gerando || !p.iaDisponivel} className="bg-primary hover:bg-primary/90">
            <Sparkles size={16} /> {gerando ? "Gerando..." : "Gerar minuta"}
          </Botao>
        </div>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">A minuta gerada por IA deve sempre ser revisada pelo advogado antes do protocolo.</p>
    </Card>
  );
}

export function GeradorModelo(p: { modelos: Opcao[]; clientes: Opcao[]; processos: ProcessoOpcao[]; cliente?: string; processo?: string }) {
  return (
    <Card
      titulo={
        <span className="flex items-center gap-2">
          <FileText size={18} className="text-primary" /> Gerar a partir de modelo
        </span>
      }
    >
      <form action={gerarDeModelo} className="grid gap-4 md:grid-cols-2">
        <Campo rotulo="Modelo *" className="md:col-span-2">
          <Selecao name="modeloId" required vazio="Selecione..." opcoes={p.modelos.map((m) => [m.id, m.nome])} />
        </Campo>
        <SeletorContexto {...p} />
        <div className="flex justify-end md:col-span-2">
          <Botao>Gerar documento</Botao>
        </div>
      </form>
    </Card>
  );
}
