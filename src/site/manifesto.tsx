"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";

function Palavra({ texto, progresso, faixa, destaque }: { texto: string; progresso: MotionValue<number>; faixa: [number, number]; destaque: boolean }) {
  const opacidade = useTransform(progresso, faixa, [0.16, 1]);
  return (
    <motion.span style={{ opacity: opacidade }} className={destaque ? "text-marca" : undefined}>
      {texto}{" "}
    </motion.span>
  );
}

/**
 * Texto que acende palavra por palavra enquanto a seção atravessa a tela.
 * Palavras entre *asteriscos* ficam na cor da marca.
 */
export function Manifesto({ texto, assinatura }: { texto: string; assinatura: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduzir = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const palavras = texto.split(" ");

  return (
    <div ref={ref}>
      <p className="text-[clamp(1.875rem,4.6vw,3.75rem)] leading-[1.12] font-semibold tracking-[-0.03em] text-balance text-camisa">
        {palavras.map((p, i) => {
          const destaque = p.startsWith("*");
          const limpa = p.replace(/\*/g, "");
          if (reduzir) return <span key={i} className={destaque ? "text-marca" : undefined}>{limpa} </span>;
          const ini = i / palavras.length;
          return <Palavra key={i} texto={limpa} progresso={scrollYProgress} faixa={[ini, ini + 1 / palavras.length]} destaque={destaque} />;
        })}
      </p>
      <p className="mt-10 text-[0.9375rem] text-camisa/45">{assinatura}</p>
    </div>
  );
}
