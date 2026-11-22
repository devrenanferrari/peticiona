import { redirect } from "next/navigation";

// A raiz abre o sistema: o painel manda para o login quando não há sessão.
// O site institucional antigo está guardado em src/site/pagina.tsx, fora das rotas.
export default function Inicio() {
  redirect("/painel");
}
