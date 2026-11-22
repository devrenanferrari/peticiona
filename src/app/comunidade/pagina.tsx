"use client";

import Script from "next/script";
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import {
  ArrowLeft, Briefcase, Calculator, Contrast, ExternalLink, HandCoins, Landmark, ListChecks, Minus, Plus, Receipt, Scale,
  BookOpen, MessageSquareWarning, Percent, ReceiptText, UserRound, Users, Volume2, Square, type LucideIcon,
} from "lucide-react";
import { MARCA } from "@/marca";
import { cn } from "@/lib/utils";
import { FERRAMENTAS, type IdFerramenta, type Publico } from "./catalogo";
import { ChecklistMei, Funcionario, Mei, Recibo, Simples, Tributo } from "./empresas";
import { Consumidor, Divida, Glossario, Irpf, Pensao, Rescisao } from "./pessoa-fisica";
import { falar, pararFala } from "./ui";

const COMPONENTES: Record<IdFerramenta, () => ReactNode> = {
  rescisao: Rescisao, irpf: Irpf, divida: Divida, pensao: Pensao, consumidor: Consumidor, glossario: Glossario,
  mei: Mei, simples: Simples, funcionario: Funcionario, tributo: Tributo, recibo: Recibo, "checklist-mei": ChecklistMei,
};
const ICONES: Record<IdFerramenta, LucideIcon> = {
  rescisao: Briefcase, irpf: Percent, divida: HandCoins, pensao: Users, consumidor: MessageSquareWarning, glossario: BookOpen,
  mei: Calculator, simples: Landmark, funcionario: UserRound, tributo: Receipt, recibo: ReceiptText, "checklist-mei": ListChecks,
};

type Aba = Publico | "ajuda";
const ABAS: [Aba, string][] = [
  ["pf", "Para você (pessoa física)"],
  ["pj", "Para empresas e MEI"],
  ["ajuda", "Onde buscar ajuda"],
];

const ESCALAS = [100, 112.5, 125, 150];

// ---------------------------------------------------------------- estado no endereço e no navegador
// A aba e a ferramenta aberta vêm do endereço (#mei, #empresas, #ajuda...): dá para compartilhar o link
// e o botão "voltar" do navegador funciona. Preferências de acessibilidade ficam no localStorage.

const ouvirHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const lerHash = () => decodeURIComponent(location.hash.slice(1));

function irPara(hash: string) {
  history.pushState(null, "", hash ? `#${hash}` : location.pathname + location.search);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

function estadoDoHash(hash: string): { aba: Aba; aberta: IdFerramenta | null } {
  if (hash === "ajuda") return { aba: "ajuda", aberta: null };
  if (hash === "empresas") return { aba: "pj", aberta: null };
  const f = FERRAMENTAS.find((x) => x.id === hash);
  return f ? { aba: f.publico, aberta: f.id } : { aba: "pf", aberta: null };
}

const EVENTO_PREF = "comunidade:preferencia";
const ouvirPref = (cb: () => void) => {
  window.addEventListener(EVENTO_PREF, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO_PREF, cb);
    window.removeEventListener("storage", cb);
  };
};
function lerPref(chave: string) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}
function salvarPref(chave: string, v: string) {
  try {
    localStorage.setItem(chave, v);
  } catch {}
  window.dispatchEvent(new Event(EVENTO_PREF));
}

export function ApoioComunidade({ repositorio }: { repositorio?: string }) {
  const hash = useSyncExternalStore(ouvirHash, lerHash, () => "");
  const { aba, aberta } = estadoDoHash(hash);
  const escala = Math.min(ESCALAS.length - 1, Math.max(0, Number(useSyncExternalStore(ouvirPref, () => lerPref("comunidade:escala"), () => null) ?? 0) || 0));
  const contraste = useSyncExternalStore(ouvirPref, () => lerPref("comunidade:contraste"), () => null) === "1";
  const setEscala = (f: (e: number) => number) => salvarPref("comunidade:escala", String(f(escala)));
  const setContraste = (f: (c: boolean) => boolean) => salvarPref("comunidade:contraste", f(contraste) ? "1" : "0");
  const [lendo, setLendo] = useState(false);
  const conteudo = useRef<HTMLElement>(null);
  const abasRef = useRef<(HTMLButtonElement | null)[]>([]);
  const primeiraVez = useRef(true);

  useEffect(() => {
    document.documentElement.style.fontSize = `${ESCALAS[escala]}%`;
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [escala]);

  // Ao abrir ou fechar uma ferramenta, leva o foco ao título (leitores de tela anunciam a mudança).
  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false;
      if (!aberta) return;
    }
    const alvo = aberta ? document.querySelector<HTMLElement>("[data-titulo-ferramenta]") : document.getElementById("titulo-aba");
    alvo?.focus({ preventScroll: true });
    if (aberta) alvo?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [aberta]);

  const abrir = (id: IdFerramenta | null) => irPara(id ?? (aba === "pj" ? "empresas" : aba === "ajuda" ? "ajuda" : ""));
  const trocarAba = (a: Aba) => irPara(a === "pj" ? "empresas" : a === "ajuda" ? "ajuda" : "");

  function teclaAbas(e: KeyboardEvent, i: number) {
    const n = ABAS.length;
    const prox = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (prox < 0) return;
    e.preventDefault();
    trocarAba(ABAS[prox][0]);
    abasRef.current[prox]?.focus();
  }

  function ouvirPagina() {
    if (lendo) {
      pararFala();
      setLendo(false);
      return;
    }
    if (conteudo.current && falar(conteudo.current.innerText)) {
      setLendo(true);
      const t = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          setLendo(false);
          clearInterval(t);
        }
      }, 500);
    }
  }

  const Componente = aberta ? COMPONENTES[aberta] : null;
  const lista = FERRAMENTAS.filter((f) => f.publico === aba);
  const tituloAba = ABAS.find(([a]) => a === aba)![1];

  return (
    <div className={cn("comunidade min-h-dvh bg-background text-foreground", contraste && "alto-contraste")}>
      <a href="#conteudo" className="sr-only z-50 rounded-md bg-marca px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Pular para o conteúdo
      </a>

      <header className="cabecalho-comunidade bg-noite text-camisa">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <p className="flex items-center gap-2.5 text-base">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARCA.simbolo} alt="" className="h-5 w-auto" />
            <span className="font-semibold">{MARCA.nome}</span>
            <span aria-hidden className="text-camisa/40">|</span>
            <span>Apoio à Comunidade</span>
          </p>
          <nav aria-label="Recursos de acessibilidade" className="flex flex-wrap items-center gap-1.5">
            <div role="group" aria-label="Tamanho do texto" className="flex items-center rounded-md border border-camisa/25">
              <button type="button" onClick={() => setEscala((e) => Math.max(0, e - 1))} disabled={escala === 0} aria-label="Diminuir texto" className="botao-a11y rounded-l-md disabled:opacity-40">
                <Minus aria-hidden className="size-4" />
              </button>
              <span className="px-1.5 text-sm tabular" aria-live="polite">
                <span className="sr-only">Tamanho do texto: </span>
                {ESCALAS[escala]}%
              </span>
              <button type="button" onClick={() => setEscala((e) => Math.min(ESCALAS.length - 1, e + 1))} disabled={escala === ESCALAS.length - 1} aria-label="Aumentar texto" className="botao-a11y rounded-r-md disabled:opacity-40">
                <Plus aria-hidden className="size-4" />
              </button>
            </div>
            <button type="button" aria-pressed={contraste} onClick={() => setContraste((c) => !c)} className="botao-a11y rounded-md border border-camisa/25">
              <Contrast aria-hidden className="size-4" /> Alto contraste
            </button>
            <button type="button" onClick={ouvirPagina} className="botao-a11y rounded-md border border-camisa/25">
              {lendo ? <Square aria-hidden className="size-4" /> : <Volume2 aria-hidden className="size-4" />}
              {lendo ? "Parar leitura" : "Ouvir página"}
            </button>
          </nav>
        </div>
      </header>

      <main id="conteudo" ref={conteudo} tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-8 pb-16 outline-none md:px-6 md:pt-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-wide text-marca uppercase">Gratuito · sem cadastro · acessível</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-4xl">Ferramentas gratuitas para o seu dia a dia</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Calculadoras e orientações em linguagem simples, para pessoas, empreendedores e MEIs. Os cálculos são feitos no seu próprio aparelho: nenhum dado pessoal é
            enviado ou guardado.
          </p>
        </div>

        <div role="tablist" aria-label="Público" className="mt-8 flex flex-wrap gap-2">
          {ABAS.map(([a, rotulo], i) => (
            <button
              key={a}
              ref={(el) => {
                abasRef.current[i] = el;
              }}
              id={`aba-${a}`}
              role="tab"
              type="button"
              aria-selected={aba === a}
              aria-controls="painel-aba"
              tabIndex={aba === a ? 0 : -1}
              onClick={() => trocarAba(a)}
              onKeyDown={(e) => teclaAbas(e, i)}
              className={cn(
                "aba-comunidade rounded-full border px-4 py-2 text-base font-medium transition-colors",
                aba === a ? "border-transparent bg-noite text-camisa dark:bg-camisa dark:text-noite" : "bg-card hover:bg-muted",
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <div id="painel-aba" role="tabpanel" aria-labelledby={`aba-${aba}`} className="mt-8">
          <h2 id="titulo-aba" tabIndex={-1} className="sr-only">
            {tituloAba}
          </h2>
          {aba === "ajuda" ? (
            <OndeBuscarAjuda />
          ) : Componente ? (
            <div>
              <button type="button" onClick={() => abrir(null)} className="mb-6 inline-flex items-center gap-1.5 text-base font-medium text-marca hover:underline">
                <ArrowLeft aria-hidden className="size-4" /> Voltar para todas as ferramentas
              </button>
              <Componente />
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lista.map((f) => {
                const Icone = ICONES[f.id];
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => abrir(f.id)}
                      className="cartao-ferramenta group flex h-full w-full items-start gap-4 rounded-xl border bg-card p-5 text-left shadow-(--sombra-cartao) transition-[border-color,transform] hover:-translate-y-0.5 hover:border-marca/50"
                    >
                      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-marca-suave text-marca">
                        <Icone className="size-5" />
                      </span>
                      <span>
                        <span className="block text-lg font-semibold">{f.titulo}</span>
                        <span className="mt-0.5 block text-base text-muted-foreground">{f.resumo}</span>
                        <span aria-hidden className="mt-2 block text-base font-medium text-marca">
                          Abrir ›
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 text-base text-muted-foreground md:px-6">
          <p className="flex items-start gap-2">
            <Scale aria-hidden className="mt-1 size-4 shrink-0" />
            <span>
              As ferramentas têm caráter informativo e educativo. Os resultados são estimativas e não substituem a orientação de um advogado ou contador. Este espaço não é
              usado para captação de clientes (Código de Ética e Disciplina da OAB e Provimento nº 205/2021).
            </span>
          </p>
          <p>
            Acessível com leitores de tela (NVDA, JAWS, TalkBack, VoiceOver) e navegação pelo teclado. Tradução para Libras pelo VLibras, do Governo Federal.
            {repositorio && (
              <>
                {" "}
                Código aberto:{" "}
                <a href={repositorio} className="inline-flex items-center gap-1 underline" target="_blank" rel="noreferrer">
                  ver no GitHub <ExternalLink aria-hidden className="size-3.5" />
                </a>
                .
              </>
            )}
          </p>
          <p className="text-sm">
            {MARCA.nomeCompleto} · {MARCA.cidade}/{MARCA.uf}
          </p>
        </div>
      </footer>

      <VLibras />
    </div>
  );
}

// ---------------------------------------------------------------- Onde buscar ajuda

const AJUDA: { titulo: string; texto: string; link?: [string, string]; contato?: string }[] = [
  { titulo: "Defensoria Pública", texto: "Assistência jurídica gratuita para quem não pode pagar um advogado: família, moradia, consumidor, saúde, defesa criminal e mais.", link: ["https://defensoria.mg.def.br", "defensoria.mg.def.br"] },
  { titulo: "Juizado Especial Cível", texto: "Causas de até 40 salários mínimos, com processo mais simples. Até 20 salários mínimos, a pessoa pode entrar com a ação sem advogado." },
  { titulo: "Justiça do Trabalho", texto: "Questões entre empregado e empregador. A reclamação pode ser apresentada diretamente na vara do trabalho." },
  { titulo: "Procon e consumidor.gov.br", texto: "Reclamações contra empresas: cobranças, produtos com defeito, serviços mal prestados. O consumidor.gov.br é gratuito e funciona pela internet.", link: ["https://www.consumidor.gov.br", "consumidor.gov.br"] },
  { titulo: "Portal do Empreendedor", texto: "Abrir, alterar ou encerrar o MEI, emitir o DAS e entregar a declaração anual. É gratuito: não pague intermediários.", link: ["https://www.gov.br/empresas-e-negocios/pt-br/empreendedor", "gov.br/empreendedor"] },
  { titulo: "Sebrae", texto: "Orientação gratuita para pequenos negócios e MEIs: gestão, finanças, formalização e cursos.", contato: "0800 570 0800", link: ["https://sebrae.com.br", "sebrae.com.br"] },
  { titulo: "Disque 100", texto: "Denúncias de violações de direitos humanos: crianças, idosos, pessoas com deficiência e outros grupos. Gratuito, 24 horas.", contato: "Ligue 100" },
  { titulo: "Central de Atendimento à Mulher", texto: "Orientação e denúncia de violência contra a mulher. Gratuito, sigiloso, 24 horas.", contato: "Ligue 180" },
];

function OndeBuscarAjuda() {
  return (
    <section aria-labelledby="titulo-ajuda">
      <h2 id="titulo-ajuda" className="font-heading text-2xl font-semibold tracking-tight">
        Onde buscar ajuda gratuita
      </h2>
      <p className="mt-1.5 max-w-3xl text-base text-muted-foreground">Serviços públicos e gratuitos para resolver problemas do dia a dia. Em caso de urgência, procure a Defensoria Pública.</p>
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {AJUDA.map((a) => (
          <li key={a.titulo} className="rounded-xl border bg-card p-5">
            <h3 className="text-lg font-semibold">{a.titulo}</h3>
            <p className="mt-1 text-base text-muted-foreground">{a.texto}</p>
            {(a.contato || a.link) && (
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-base font-medium">
                {a.contato && <span>{a.contato}</span>}
                {a.link && (
                  <a href={a.link[0]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-marca underline">
                    {a.link[1]} <ExternalLink aria-hidden className="size-3.5" />
                    <span className="sr-only">(abre em nova aba)</span>
                  </a>
                )}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- VLibras (Libras)

declare global {
  interface Window {
    VLibras?: { Widget: new (url: string) => unknown };
  }
}

function VLibras() {
  return (
    <>
      <div {...{ vw: "" }} className="enabled">
        <div {...{ "vw-access-button": "" }} className="active" />
        <div {...{ "vw-plugin-wrapper": "" }}>
          <div className="vw-plugin-top-wrapper" />
        </div>
      </div>
      <Script
        src="https://vlibras.gov.br/app/vlibras-plugin.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (!window.VLibras) return;
          new window.VLibras.Widget("https://vlibras.gov.br/app");
          // O widget inicia no evento "load" da janela, que já passou quando a página é navegada pelo app.
          if (typeof window.onload === "function") window.onload(new Event("load"));
        }}
      />
    </>
  );
}
