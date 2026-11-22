import { ListaAbertos } from "../abertos";

export const metadata = { title: "Contas a pagar" };

export default function Pagar() {
  return <ListaAbertos tipo="DESPESA" />;
}
