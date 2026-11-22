"use client";

import type { Modelo } from "@prisma/client";
import { useRef } from "react";
import { Botao, Campo, Card, Entrada, Selecao } from "@/components/kit";
import { VARIAVEIS } from "@/lib/modelos";
import { salvarModelo } from "./actions";

export function FormModelo({ modelo }: { modelo?: Modelo }) {
  const texto = useRef<HTMLTextAreaElement>(null);

  function inserir(variavel: string) {
    const el = texto.current;
    if (!el) return;
    const marcador = `{{${variavel}}}`;
    const { selectionStart: i, selectionEnd: f, value } = el;
    el.value = value.slice(0, i) + marcador + value.slice(f);
    el.focus();
    el.selectionStart = el.selectionEnd = i + marcador.length;
  }

  return (
    <form action={salvarModelo} className="grid gap-6 lg:grid-cols-4">
      {modelo && <input type="hidden" name="id" value={modelo.id} />}
      <div className="space-y-6 lg:col-span-3">
        <Card>
          <div className="grid gap-4 md:grid-cols-4">
            <Campo rotulo="Título *" className="md:col-span-2">
              <Entrada name="titulo" required defaultValue={modelo?.titulo} />
            </Campo>
            <Campo rotulo="Categoria">
              <Selecao name="categoria" defaultValue={modelo?.categoria ?? "Petição"} opcoes={["Petição", "Recurso", "Contrato", "Procuração", "Declaração", "Notificação", "Outro"]} />
            </Campo>
            <Campo rotulo="Área">
              <Entrada name="area" defaultValue={modelo?.area ?? ""} placeholder="Cível, Trabalhista..." />
            </Campo>
          </div>
        </Card>
        <textarea
          ref={texto}
          name="conteudo"
          required
          defaultValue={modelo?.conteudo}
          className="folha min-h-[70vh] w-full rounded-xl border border-border bg-card p-10 shadow-sm outline-none focus:ring-2 focus:ring-ring/25"
          placeholder="Escreva o modelo. Use as variáveis ao lado, ex.: {{cliente.nome}}"
        />
        <div className="flex justify-end">
          <Botao>Salvar modelo</Botao>
        </div>
      </div>
      <Card titulo="Variáveis" className="h-fit lg:sticky lg:top-6">
        <p className="mb-3 text-xs text-muted-foreground">Clique para inserir no cursor. Ao gerar o documento, elas são trocadas pelos dados do cliente e do processo.</p>
        {Object.entries(VARIAVEIS).map(([grupo, vars]) => (
          <div key={grupo} className="mb-3">
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{grupo}</p>
            <div className="flex flex-wrap gap-1">
              {vars.map(([v, rotulo]) => (
                <button key={v} type="button" onClick={() => inserir(v)} title={`{{${v}}}`} className="rounded bg-accent px-2 py-0.5 text-xs text-primary hover:bg-primary/15">
                  {rotulo}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Card>
    </form>
  );
}
