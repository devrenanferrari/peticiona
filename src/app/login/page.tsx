import type { Metadata } from "next";
import { MARCA, PERMITIR_CADASTRO } from "@/marca";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default function Login() {
  const demo = process.env.NODE_ENV !== "production" ? { email: "admin@escritoriomodelo.adv.br", senha: "modelo123" } : null;

  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Painel do escritório */}
      <section className="relative isolate hidden overflow-hidden bg-noite text-camisa lg:flex lg:flex-col">
        <div aria-hidden className="granulado pointer-events-none absolute inset-0 -z-10 opacity-[0.05] mix-blend-overlay" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_30%_100%,color-mix(in_oklch,var(--marca)_30%,transparent),transparent_70%)]"
        />
        <div className="flex items-center justify-between p-10">
          <span className="inline-flex items-center gap-2.5 text-sm text-camisa/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARCA.simbolo} alt="" className="h-5 w-auto opacity-80" />
            {MARCA.sistema}
          </span>
          <span className="text-sm text-camisa/40">
            {MARCA.cidade} · {MARCA.uf}
          </span>
        </div>

        <div className="mt-auto px-10 pb-14 xl:px-14">
          <h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marca/logotipo.png" alt={MARCA.nomeCompleto} className="w-[min(25rem,85%)]" />
          </h1>
          <p className="mt-10 max-w-sm text-[0.9375rem] leading-relaxed text-camisa/55">
            {MARCA.sistema}. Clientes, processos, prazos e financeiro do escritório em um só lugar.
          </p>
        </div>
      </section>

      {/* Formulário */}
      <section className="flex flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-[22.5rem]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-md bg-shell">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={MARCA.simbolo} alt="" className="h-5 w-auto" />
            </span>
            <span className="text-[1.0625rem] font-semibold tracking-tight">{MARCA.nome}</span>
          </div>
          <FormularioLogin permitirCadastro={PERMITIR_CADASTRO} demo={demo} />
        </div>
      </section>
    </main>
  );
}
