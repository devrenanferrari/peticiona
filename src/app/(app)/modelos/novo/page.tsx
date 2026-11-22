import { Cabecalho } from "@/components/kit";
import { FormModelo } from "../form-modelo";

export const metadata = { title: "Novo modelo" };

export default function NovoModelo() {
  return (
    <>
      <Cabecalho titulo="Novo modelo" />
      <FormModelo />
    </>
  );
}
