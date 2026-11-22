"use client";

import { Printer } from "lucide-react";
import { Botao } from "@/components/kit";

export function Imprimir() {
  return (
    <Botao type="button" variante="secundario" onClick={() => window.print()}>
      <Printer size={16} /> Imprimir / PDF
    </Botao>
  );
}
