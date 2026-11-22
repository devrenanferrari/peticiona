"use client";

import type { ComponentProps } from "react";
import { Botao } from "./kit";

/** Botão de submit que pede confirmação antes de enviar o formulário. */
export function BotaoConfirmar({ mensagem = "Tem certeza?", ...p }: ComponentProps<typeof Botao> & { mensagem?: string }) {
  return (
    <Botao
      {...p}
      onClick={(e) => {
        if (!confirm(mensagem)) e.preventDefault();
      }}
    />
  );
}
