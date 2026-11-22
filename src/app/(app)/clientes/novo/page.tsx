import { Cabecalho } from "@/components/kit";
import { FormCliente } from "../form-cliente";

export const metadata = { title: "Novo contato" };

export default function NovoCliente() {
  return (
    <>
      <Cabecalho titulo="Novo contato" />
      <FormCliente />
    </>
  );
}
