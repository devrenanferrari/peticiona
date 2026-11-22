"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Monograma } from "@/components/monograma";
import { SITE } from "./config";

const LINKS = [
  ["#tributario", "Tributário"],
  ["#empresarial", "Empresarial"],
  ["#metodo", "Método"],
  ["#socios", "Sócios"],
  ["#contato", "Contato"],
];

export function Cabecalho() {
  const [rolou, setRolou] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 8);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = aberto ? "hidden" : "";
  }, [aberto]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300",
        rolou || aberto ? "border-b border-white/[0.08] bg-noite/72 backdrop-blur-2xl backdrop-saturate-150" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-12 max-w-[68rem] items-center justify-between px-4 md:h-14 md:px-6">
        <Link href="#inicio" className="flex items-center gap-2.5 text-camisa" onClick={() => setAberto(false)} aria-label={SITE.nomeCompleto}>
          <Monograma claro className="size-7 text-[0.75rem]" />
          <span className="font-display text-[1.0625rem] tracking-tight">{SITE.nome}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Seções">
          {LINKS.map(([href, rotulo]) => (
            <a key={href} href={href} className="text-[0.8125rem] text-camisa/70 transition-colors hover:text-camisa">
              {rotulo}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link href="/login" className="hidden px-3 text-[0.8125rem] text-camisa/55 transition-colors hover:text-camisa md:block">
            Equipe
          </Link>
          <a
            href="#contato"
            className="hidden h-8 items-center rounded-full bg-camisa px-4 text-[0.8125rem] font-medium text-noite transition-[background-color,transform] duration-200 hover:bg-white active:scale-[0.97] md:inline-flex"
          >
            Fale com um sócio
          </a>
          <button
            className="relative flex size-11 items-center justify-center text-camisa md:hidden"
            onClick={() => setAberto(!aberto)}
            aria-label={aberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={aberto}
          >
            <span className={cn("absolute h-px w-4 bg-current transition-transform duration-300 ease-(--ease-apple)", aberto ? "rotate-45" : "-translate-y-[3.5px]")} />
            <span className={cn("absolute h-px w-4 bg-current transition-transform duration-300 ease-(--ease-apple)", aberto ? "-rotate-45" : "translate-y-[3.5px]")} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {aberto && (
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="h-[calc(100dvh-3rem)] overflow-y-auto px-8 pt-6 pb-10 md:hidden"
            aria-label="Menu"
          >
            {[...LINKS, ["/login", "Área da equipe"]].map(([href, rotulo], i) => (
              <motion.a
                key={href}
                href={href}
                onClick={() => setAberto(false)}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="block py-2.5 text-[1.75rem] font-semibold tracking-[-0.02em] text-camisa"
              >
                {rotulo}
              </motion.a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
