import { ListaAbertos } from "../abertos";

export const metadata = { title: "Contas a receber" };

export default function Receber() {
  return <ListaAbertos tipo="RECEITA" />;
}
