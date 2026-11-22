import { Cabecalho } from "@/components/kit";
import { FormProcesso } from "../form-processo";

export const metadata = { title: "Novo processo" };

export default async function NovoProcesso({ searchParams }: { searchParams: Promise<{ cliente?: string; instancia?: string }> }) {
  const { cliente, instancia } = await searchParams;
  return (
    <>
      <Cabecalho titulo="Novo processo" codigo="PR01" />
      <FormProcesso clienteId={cliente} instancia={instancia === "2" ? "2ª instância" : undefined} />
    </>
  );
}
