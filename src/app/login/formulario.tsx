"use client";

import { useActionState, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { MARCA } from "@/marca";
import { cn } from "@/lib/utils";
import { cadastrarEscritorio, entrar } from "./actions";

/** Campo do grupo empilhado (como no login da Apple): rótulo flutuante dentro do campo. */
function CampoGrupo({ id, rotulo, className, children, ...p }: React.ComponentProps<"input"> & { rotulo: string }) {
  return (
    <div
      className={cn(
        "relative bg-card transition-shadow duration-150 focus-within:z-10 focus-within:shadow-[inset_0_0_0_1.5px_color-mix(in_oklch,var(--marca)_75%,transparent),0_0_0_4px_color-mix(in_oklch,var(--marca)_18%,transparent)]",
        className,
      )}
    >
      <input
        id={id}
        placeholder=" "
        className="peer h-14 w-full bg-transparent px-4 pt-5 pb-1.5 text-[0.9375rem] outline-none focus-visible:outline-none"
        {...p}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute top-1/2 left-4 origin-left -translate-y-1/2 text-[0.9375rem] text-muted-foreground transition-all duration-200 ease-(--ease-apple) peer-not-placeholder-shown:top-[1.15rem] peer-not-placeholder-shown:scale-[0.8] peer-focus:top-[1.15rem] peer-focus:scale-[0.8]"
      >
        {rotulo}
      </label>
      {children}
    </div>
  );
}

export function FormularioLogin({ permitirCadastro, demo }: { permitirCadastro: boolean; demo: { email: string; senha: string } | null }) {
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [verSenha, setVerSenha] = useState(false);
  const [estadoLogin, acaoLogin, entrando] = useActionState(entrar, undefined);
  const [estadoCadastro, acaoCadastro, cadastrando] = useActionState(cadastrarEscritorio, undefined);
  const erro = modo === "entrar" ? estadoLogin?.erro : estadoCadastro?.erro;
  const carregando = modo === "entrar" ? entrando : cadastrando;
  const grupo = "overflow-hidden rounded-[14px] border border-input shadow-(--sombra-cartao) [&>*+*]:border-t [&>*+*]:border-input";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
      <h2 className="font-heading text-[2rem] leading-tight font-bold tracking-[-0.025em]">
        {modo === "entrar" ? "Boas-vindas." : "Novo escritório"}
      </h2>
      <p className="mt-2 text-[0.9375rem] text-muted-foreground">
        {modo === "entrar" ? `Entre na área da equipe ${MARCA.nome}.` : "Crie a conta do escritório. A equipe pode ser convidada depois."}
      </p>

      <form key={modo} action={modo === "entrar" ? acaoLogin : acaoCadastro} className="mt-9">
        {modo === "cadastrar" && (
          <div className={cn(grupo, "mb-3")}>
            <CampoGrupo id="escritorio" name="escritorio" rotulo="Nome do escritório" required autoFocus />
            <CampoGrupo id="nome" name="nome" rotulo="Seu nome" required autoComplete="name" />
          </div>
        )}
        <div className={grupo}>
          <CampoGrupo id="email" name="email" type="email" rotulo="E-mail" required autoComplete="username" autoFocus={modo === "entrar"} defaultValue={demo?.email} />
          <CampoGrupo
            id="senha"
            name="senha"
            type={verSenha ? "text" : "password"}
            rotulo="Senha"
            required
            minLength={modo === "cadastrar" ? 8 : undefined}
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            className="pr-24"
          >
            <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {verSenha ? <EyeOff className="size-[1.05rem]" /> : <Eye className="size-[1.05rem]" />}
              </button>
              <button
                type="submit"
                disabled={carregando}
                aria-label={modo === "entrar" ? "Entrar" : "Criar escritório"}
                className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-95 disabled:opacity-60"
              >
                {carregando ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" strokeWidth={2.25} />}
              </button>
            </div>
          </CampoGrupo>
        </div>

        {erro && (
          <p role="alert" className="mt-4 text-center text-sm text-destructive">
            {erro}
          </p>
        )}
      </form>

      <div className="mt-10 space-y-3 text-center text-[0.8125rem] text-muted-foreground">
        {permitirCadastro && (
          <p>
            {modo === "entrar" ? "Escritório novo?" : "Já tem conta?"}{" "}
            <button type="button" onClick={() => setModo(modo === "entrar" ? "cadastrar" : "entrar")} className="font-medium text-marca hover:underline">
              {modo === "entrar" ? "Criar conta" : "Entrar"}
            </button>
          </p>
        )}
        <p>Esqueceu a senha? Fale com o administrador do escritório.</p>
        {demo && (
          <p className="text-muted-foreground/70">
            Ambiente de testes · {demo.email} · {demo.senha}
          </p>
        )}
      </div>
    </motion.div>
  );
}
