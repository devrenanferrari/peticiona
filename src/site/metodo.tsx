"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ETAPAS = [
  {
    titulo: "Diagnóstico",
    texto: "Antes de qualquer peça, entendemos o negócio: operação, caixa, riscos e o que a diretoria precisa decidir.",
    detalhe: "Reunião com um sócio",
  },
  {
    titulo: "Estratégia",
    texto: "Caminhos possíveis, com prós, contras, prazos e custos de cada um, explicados em linguagem de gestão.",
    detalhe: "Proposta por escrito",
  },
  {
    titulo: "Execução",
    texto: "Uma equipe dedicada conduz a demanda, com prazos controlados em sistema próprio e um sócio responsável.",
    detalhe: "Prazos monitorados",
  },
  {
    titulo: "Acompanhamento",
    texto: "Você sabe onde está cada assunto, sem precisar perguntar. Relatórios periódicos e canal direto com a equipe.",
    detalhe: "Relatórios periódicos",
  },
];

export function Metodo() {
  const trilho = useRef<HTMLOListElement>(null);
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    const itens = Array.from(el.children) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) if (e.isIntersecting) setAtual(itens.indexOf(e.target as HTMLElement));
      },
      { root: el, threshold: 0.6 },
    );
    itens.forEach((i) => obs.observe(i));
    return () => obs.disconnect();
  }, []);

  const ir = (i: number) => {
    const t = trilho.current;
    const el = t?.children[i] as HTMLElement | undefined;
    if (t && el) t.scrollTo({ left: el.offsetLeft - parseFloat(getComputedStyle(t).paddingLeft), behavior: "smooth" });
  };

  return (
    <div>
      <ol
        ref={trilho}
        className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth scroll-px-[max(1.25rem,calc((100vw-68rem)/2+1.5rem))] px-[max(1.25rem,calc((100vw-68rem)/2+1.5rem))] pb-2 [scrollbar-width:none] md:gap-5 [&::-webkit-scrollbar]:hidden"
        aria-label="Etapas do método"
      >
        {ETAPAS.map((e, i) => (
          <li
            key={e.titulo}
            className="relative flex aspect-[4/5] w-[min(82vw,24rem)] shrink-0 snap-start flex-col overflow-hidden rounded-[1.75rem] bg-grafite-2 p-8 md:w-[26rem] md:p-10"
          >
            <span aria-hidden className="pointer-events-none absolute -right-4 -bottom-16 font-display text-[18rem] leading-none text-white/[0.035] select-none">
              {i + 1}
            </span>
            <p className="text-[0.8125rem] font-semibold text-marca">Etapa {i + 1} de {ETAPAS.length}</p>
            <h3 className="texto-display mt-4 text-[2.75rem] text-camisa md:text-[3.25rem]">{e.titulo}</h3>
            <p className="mt-auto max-w-[22rem] text-[1.0625rem] leading-relaxed text-camisa/70">{e.texto}</p>
            <p className="mt-6 border-t border-white/10 pt-5 text-[0.8125rem] text-camisa/45">{e.detalhe}</p>
          </li>
        ))}
      </ol>

      <div className="mx-auto mt-8 flex max-w-[68rem] items-center justify-between px-4 md:px-6">
        <div className="flex gap-2" aria-hidden>
          {ETAPAS.map((e, i) => (
            <span key={e.titulo} className={cn("h-1.5 rounded-full bg-camisa transition-all duration-500 ease-(--ease-apple)", i === atual ? "w-6 opacity-90" : "w-1.5 opacity-25")} />
          ))}
        </div>
        <div className="flex gap-3">
          {[
            [ChevronLeft, "Etapa anterior", -1],
            [ChevronRight, "Próxima etapa", 1],
          ].map(([Icone, rotulo, passo]) => {
            const I = Icone as typeof ChevronLeft;
            const destino = atual + (passo as number);
            return (
              <button
                key={rotulo as string}
                onClick={() => ir(destino)}
                disabled={destino < 0 || destino >= ETAPAS.length}
                aria-label={rotulo as string}
                className="flex size-11 items-center justify-center rounded-full bg-white/10 text-camisa transition-[background-color,opacity,transform] duration-200 hover:bg-white/15 active:scale-95 disabled:opacity-30"
              >
                <I className="size-5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
