import type { Metadata } from "next";
import { MARCA } from "@/marca";
import { ApoioComunidade } from "./pagina";

// Página pública: fica fora do grupo (app), então não exige login.
export const metadata: Metadata = {
  title: "Apoio à Comunidade",
  description: `Ferramentas jurídicas gratuitas e acessíveis para pessoas, empreendedores e MEIs · ${MARCA.nomeCompleto}`,
};

export default function Pagina() {
  return <ApoioComunidade repositorio={process.env.REPOSITORIO_URL || undefined} />;
}
