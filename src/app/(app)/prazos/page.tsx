import { Cabecalho } from "@/components/kit";
import { exigirUsuario } from "@/lib/auth";
import { Calculadora } from "./calculadora";

export const metadata = { title: "Calculadora de prazos" };

export default async function Prazos() {
  await exigirUsuario();
  return (
    <>
      <Cabecalho titulo="Calculadora de prazos" subtitulo="Contagem conforme o CPC: dias úteis, feriados nacionais, recesso forense e regra do DJe" />
      <Calculadora />
    </>
  );
}
