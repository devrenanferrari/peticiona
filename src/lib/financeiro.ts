import { db } from "./db";

/** Saldo realizado de cada conta: saldo inicial + receitas pagas − despesas pagas ± transferências. */
export async function saldosContas(escritorioId: string) {
  const [contas, pagos] = await Promise.all([
    db.contaBancaria.findMany({ where: { escritorioId }, orderBy: { nome: "asc" } }),
    db.lancamento.findMany({
      where: { escritorioId, pagamento: { not: null } },
      select: { tipo: true, valor: true, contaId: true, contaDestinoId: true },
    }),
  ]);
  const saldo = new Map(contas.map((c) => [c.id, c.saldoInicial]));
  const somar = (id: string | null, v: number) => id && saldo.has(id) && saldo.set(id, saldo.get(id)! + v);
  for (const l of pagos) {
    if (l.tipo === "RECEITA") somar(l.contaId, l.valor);
    else if (l.tipo === "DESPESA") somar(l.contaId, -l.valor);
    else {
      somar(l.contaId, -l.valor);
      somar(l.contaDestinoId, l.valor);
    }
  }
  return contas.map((c) => ({ ...c, saldo: saldo.get(c.id)! }));
}

export function intervaloMes(mes?: string) {
  const agora = new Date();
  const [a, m] = mes ? mes.split("-").map(Number) : [agora.getFullYear(), agora.getMonth() + 1];
  return { inicio: new Date(a, m - 1, 1), fim: new Date(a, m, 1), ano: a, mes: m };
}
