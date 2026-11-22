"use client";

import { useActionState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { enviarContato } from "./actions";
import { AREAS_SITE, SITE } from "./config";

const campo =
  "h-12 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 text-[0.9375rem] text-camisa placeholder:text-camisa/30 outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-[color-mix(in_oklch,var(--marca)_70%,transparent)] focus:bg-white/[0.07] focus:shadow-[0_0_0_4px_color-mix(in_oklch,var(--marca)_20%,transparent)]";

function Rotulo({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[0.8125rem] font-medium text-camisa/60">
      {children}
    </label>
  );
}

export function FormularioContato() {
  const [estado, acao, enviando] = useActionState(enviarContato, undefined);

  if (estado?.ok) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex min-h-[26rem] flex-col items-center justify-center text-center"
        role="status"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-marca text-white">
          <Check className="size-7" strokeWidth={2.5} />
        </span>
        <h3 className="texto-display mt-8 text-[2.75rem] text-camisa">Recebido.</h3>
        <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-camisa/60">
          Um advogado da equipe retorna em até um dia útil. Se preferir, adiante a conversa pelo WhatsApp.
        </p>
        <a
          href={`https://wa.me/${SITE.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex items-center gap-1 text-[0.9375rem] font-medium text-marca hover:underline"
        >
          Abrir o WhatsApp <ArrowRight className="size-4" />
        </a>
      </motion.div>
    );
  }

  const c = estado?.campos;
  return (
    <form action={acao} className="grid gap-5" noValidate={false}>
      {/* armadilha para robôs */}
      <input type="text" name="site" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Rotulo htmlFor="f-nome">Nome</Rotulo>
          <input id="f-nome" name="nome" required autoComplete="name" defaultValue={c?.nome} className={campo} />
        </div>
        <div>
          <Rotulo htmlFor="f-empresa">Empresa</Rotulo>
          <input id="f-empresa" name="empresa" autoComplete="organization" defaultValue={c?.empresa} className={campo} />
        </div>
        <div>
          <Rotulo htmlFor="f-email">E-mail</Rotulo>
          <input id="f-email" name="email" type="email" required autoComplete="email" defaultValue={c?.email} className={campo} />
        </div>
        <div>
          <Rotulo htmlFor="f-tel">WhatsApp</Rotulo>
          <input id="f-tel" name="telefone" type="tel" required autoComplete="tel" placeholder="(31) 9 0000-0000" defaultValue={c?.telefone} className={campo} />
        </div>
      </div>
      <div>
        <Rotulo htmlFor="f-area">Assunto</Rotulo>
        <select
          id="f-area"
          name="area"
          defaultValue={c?.area ?? ""}
          className={cn(
            campo,
            "appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a9a7a3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:16px] bg-[position:right_1rem_center] bg-no-repeat pr-10 [&>option]:bg-grafite",
          )}
        >
          <option value="" disabled>
            Selecione
          </option>
          {AREAS_SITE.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>
      <div>
        <Rotulo htmlFor="f-msg">Mensagem (opcional)</Rotulo>
        <textarea id="f-msg" name="mensagem" rows={4} defaultValue={c?.mensagem} className={cn(campo, "h-auto resize-none py-3 leading-relaxed")} />
      </div>
      <label className="flex items-start gap-3 text-[0.8125rem] leading-relaxed text-camisa/50">
        <input type="checkbox" name="consentimento" required className="mt-0.5 shrink-0" />
        Autorizo o uso destes dados para retorno do contato, conforme a LGPD (Lei nº 13.709/2018). As informações são tratadas com sigilo profissional.
      </label>
      {estado?.erro && (
        <p role="alert" className="text-sm text-[oklch(0.75_0.15_25)]">
          {estado.erro}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-camisa px-7 text-[0.9375rem] font-medium text-noite transition-[background-color,transform,opacity] duration-200 hover:bg-white active:scale-[0.98] disabled:opacity-60 sm:justify-self-start"
      >
        {enviando && <Loader2 className="size-4 animate-spin" />}
        {enviando ? "Enviando" : "Enviar mensagem"}
      </button>
    </form>
  );
}
