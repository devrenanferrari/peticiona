"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { MARCA } from "@/marca";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Primeira tela: título, ações e o monograma em escala de fachada, cortado pela base. */
export function Abertura({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const reduzir = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const subir = useTransform(scrollYProgress, [0, 1], ["0%", reduzir ? "0%" : "-12%"]);
  const sumir = useTransform(scrollYProgress, [0, 0.6], [1, reduzir ? 1 : 0]);
  const [a, b] = MARCA.monograma;

  return (
    <section ref={ref} id="inicio" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-noite pt-12 md:pt-14">
      <div aria-hidden className="granulado pointer-events-none absolute inset-0 -z-10 opacity-[0.045] mix-blend-overlay" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[70%] bg-[radial-gradient(60%_60%_at_50%_100%,color-mix(in_oklch,var(--marca)_22%,transparent),transparent_75%)]"
      />

      <motion.div style={{ opacity: sumir }} className="relative z-10 mx-auto w-full max-w-[68rem] px-5 pt-[clamp(4rem,13vh,9rem)] text-center md:px-6">
        {children}
      </motion.div>

      <motion.div style={{ y: subir }} className="pointer-events-none relative mt-auto flex justify-center select-none" aria-hidden>
        <motion.p
          initial={reduzir ? false : { y: "35%", opacity: 0, filter: "blur(18px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.6, delay: 0.25, ease: EASE }}
          className="mb-[-0.24em] font-display text-[50vw] md:text-[clamp(11rem,38vw,34rem)] leading-[0.8] tracking-[-0.06em] whitespace-nowrap text-camisa"
        >
          {a}
          <span className="text-marca italic">&amp;</span>
          {b}
        </motion.p>
      </motion.div>
    </section>
  );
}

/** Entrada em cascata dos textos da primeira tela. */
export function Entrada({ children, ordem = 0, className }: { children: React.ReactNode; ordem?: number; className?: string }) {
  const reduzir = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduzir ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.1 + ordem * 0.09, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
