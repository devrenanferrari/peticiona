"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { Volume2, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { registrarUso } from "./actions";

// ---------------------------------------------------------------- leitura em voz alta

export function falar(texto: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto.replace(/\s+/g, " ").trim());
  u.lang = "pt-BR";
  u.rate = 0.95;
  const voz = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("pt"));
  if (voz) u.voice = voz;
  window.speechSynthesis.speak(u);
  return true;
}

export function pararFala() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function BotaoOuvir({ alvo, rotulo = "Ouvir resultado", className }: { alvo: () => HTMLElement | null; rotulo?: string; className?: string }) {
  const [falando, setFalando] = useState(false);
  useEffect(() => () => pararFala(), []);
  return (
    <button
      type="button"
      onClick={() => {
        if (falando) {
          pararFala();
          setFalando(false);
          return;
        }
        const el = alvo();
        if (el && falar(el.innerText)) {
          setFalando(true);
          const t = setInterval(() => {
            if (!window.speechSynthesis.speaking) {
              setFalando(false);
              clearInterval(t);
            }
          }, 400);
        }
      }}
      className={cn("inline-flex items-center gap-1.5 rounded-md border border-current/25 px-2.5 py-1 text-sm font-medium hover:bg-current/10", className)}
    >
      {falando ? <Square aria-hidden className="size-3.5" /> : <Volume2 aria-hidden className="size-4" />}
      {falando ? "Parar leitura" : rotulo}
    </button>
  );
}

// ---------------------------------------------------------------- contagem anônima

/** Registra uma utilização por carregamento de página (não a cada clique). */
export function useRegistrarUso(id: string) {
  const feito = useRef(false);
  return () => {
    if (feito.current) return;
    feito.current = true;
    void registrarUso(id);
  };
}

// ---------------------------------------------------------------- formulário

export function Ferramenta({
  id, titulo, descricao, botao = "Calcular", aoEnviar, resultado, children, base,
}: {
  id: string;
  titulo: string;
  descricao: ReactNode;
  botao?: string;
  /** Retorna uma mensagem de erro (texto) quando os dados não são válidos. */
  aoEnviar: () => string | void;
  resultado: ReactNode;
  children: ReactNode;
  /** Base legal ou observação mostrada abaixo do formulário. */
  base?: ReactNode;
}) {
  const [erro, setErro] = useState("");
  const [versao, setVersao] = useState(0);
  const resRef = useRef<HTMLDivElement>(null);
  const registrar = useRegistrarUso(id);

  useEffect(() => {
    if (versao > 0) resRef.current?.focus();
  }, [versao]);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const msg = aoEnviar();
    if (msg) {
      setErro(msg);
      return;
    }
    setErro("");
    setVersao((v) => v + 1);
    registrar();
  }

  return (
    <section aria-labelledby={`titulo-${id}`} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <h2 id={`titulo-${id}`} tabIndex={-1} data-titulo-ferramenta className="font-heading text-2xl font-semibold tracking-tight outline-none">
          {titulo}
        </h2>
        <p className="mt-1.5 text-base text-muted-foreground">{descricao}</p>
        <form onSubmit={enviar} noValidate className="mt-5 grid gap-4">
          {children}
          {erro && (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-base text-destructive">
              {erro}
            </p>
          )}
          <button type="submit" className="botao-comunidade justify-self-start">
            {botao}
          </button>
        </form>
        {base && <p className="mt-5 text-sm text-muted-foreground">{base}</p>}
      </div>
      <div ref={resRef} tabIndex={-1} aria-live="polite" aria-atomic="true" className="min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {versao > 0 ? (
          <div key={versao}>{resultado}</div>
        ) : (
          <div className="flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed p-6 text-center text-base text-muted-foreground">
            Preencha os dados e pressione “{botao}”. O resultado aparece aqui e é lido automaticamente pelo leitor de tela.
          </div>
        )}
      </div>
    </section>
  );
}

/** Painel escuro de resultado com valor em destaque, detalhes e botão de ouvir. */
export function PainelResultado({ titulo, destaque, children, aviso }: { titulo: string; destaque: ReactNode; children?: ReactNode; aviso?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="painel-resultado rounded-xl bg-noite p-6 text-camisa">
      <p className="text-sm text-camisa/70">{titulo}</p>
      <p className="mt-1 font-heading text-3xl font-semibold tabular md:text-4xl">{destaque}</p>
      {children && <div className="mt-5 text-base">{children}</div>}
      {aviso && <p className="mt-5 border-t border-camisa/15 pt-4 text-sm text-camisa/70">{aviso}</p>}
      <BotaoOuvir alvo={() => ref.current} className="mt-5 text-camisa" />
    </div>
  );
}

export function Linhas({ itens }: { itens: { rotulo: ReactNode; valor: ReactNode; detalhe?: ReactNode; forte?: boolean }[] }) {
  return (
    <dl className="divide-y divide-camisa/12">
      {itens.map((i, k) => (
        <div key={k} className={cn("flex items-baseline justify-between gap-4 py-2", i.forte && "font-semibold")}>
          <dt>
            {i.rotulo}
            {i.detalhe && <span className="block text-sm text-camisa/60">{i.detalhe}</span>}
          </dt>
          <dd className="tabular text-right">{i.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------- campos

export function CampoC({ rotulo, dica, children }: { rotulo: string; dica?: string; children: (props: { id: string; "aria-describedby"?: string }) => ReactNode }) {
  const id = useId();
  const dicaId = dica ? `${id}-dica` : undefined;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-base font-medium">
        {rotulo}
      </label>
      {children({ id, "aria-describedby": dicaId })}
      {dica && (
        <p id={dicaId} className="text-sm text-muted-foreground">
          {dica}
        </p>
      )}
    </div>
  );
}

export function EntradaC({ rotulo, dica, className, ...p }: ComponentProps<"input"> & { rotulo: string; dica?: string }) {
  return <CampoC rotulo={rotulo} dica={dica}>{(a) => <input {...a} {...p} className={cn("campo campo-comunidade", className)} />}</CampoC>;
}

export function ValorC({ rotulo, dica, valor, setValor, obrigatorio = true }: { rotulo: string; dica?: string; valor: string; setValor: (v: string) => void; obrigatorio?: boolean }) {
  return (
    <EntradaC
      rotulo={rotulo}
      dica={dica}
      inputMode="decimal"
      autoComplete="off"
      placeholder="0,00"
      aria-required={obrigatorio}
      value={valor}
      onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
    />
  );
}

export function SelecaoC({ rotulo, dica, opcoes, ...p }: ComponentProps<"select"> & { rotulo: string; dica?: string; opcoes: [string, string][] }) {
  return (
    <CampoC rotulo={rotulo} dica={dica}>
      {(a) => (
        <select {...a} {...p} className="campo campo-comunidade">
          {opcoes.map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </select>
      )}
    </CampoC>
  );
}

export function Grupo({ legenda, children }: { legenda: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-2 rounded-lg border p-3">
      <legend className="px-1 text-base font-medium">{legenda}</legend>
      {children}
    </fieldset>
  );
}

export function Opcao({ nome, valor, atual, setAtual, children }: { nome: string; valor: string; atual: string; setAtual: (v: string) => void; children: ReactNode }) {
  return (
    <label className="flex items-start gap-2.5 text-base">
      <input type="radio" name={nome} value={valor} checked={atual === valor} onChange={() => setAtual(valor)} className="mt-1.5 size-4 accent-[var(--marca)]" />
      <span>{children}</span>
    </label>
  );
}

/** Botão que copia um texto e avisa o leitor de tela. */
export function BotaoCopiar({ texto }: { texto: () => string }) {
  const [ok, setOk] = useState(false);
  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md border border-current/25 px-2.5 py-1 text-sm font-medium hover:bg-current/10"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(texto());
            setOk(true);
            setTimeout(() => setOk(false), 2500);
          } catch {
            setOk(false);
          }
        }}
      >
        {ok ? "Copiado!" : "Copiar texto"}
      </button>
      <span className="sr-only" role="status">
        {ok ? "Texto copiado para a área de transferência" : ""}
      </span>
    </>
  );
}
