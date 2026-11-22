// Cálculos da área pública "Apoio à Comunidade".
// Tudo aqui é estimativa informativa: os resultados não substituem a orientação de um advogado ou contador.
// Os valores de referência ficam reunidos em PARAMETROS e devem ser conferidos todo ano.

import { addMonths, addYears, differenceInCalendarDays, differenceInYears } from "date-fns";

export const PARAMETROS = {
  ano: 2026,
  salarioMinimo: 1621,
  /** INSS do empregado: faixas progressivas [limite superior, alíquota]. */
  inss: [
    [1621.0, 0.075],
    [2902.84, 0.09],
    [4354.27, 0.12],
    [8475.55, 0.14],
  ] as [number, number][],
  /** IRRF mensal: [limite superior, alíquota, parcela a deduzir]. */
  irrf: [
    [2428.8, 0, 0],
    [2826.65, 0.075, 182.16],
    [3751.05, 0.15, 394.16],
    [4664.68, 0.225, 675.49],
    [Infinity, 0.275, 908.73],
  ] as [number, number, number][],
  irrfDependente: 189.59,
  irrfDescontoSimplificado: 607.2,
  /** Redução do IR mensal (Lei 15.270/2025): isenção até R$ 5.000 e redução gradual até R$ 7.350. */
  irrfReducao: { isencaoAte: 5000, reducaoMaxima: 312.89, faixaAte: 7350, a: 978.62, b: 0.133145 },
  mei: { limiteAnual: 81000, icms: 1, iss: 5, inssPercentual: 0.05 },
};

export const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const pct = (v: number, casas = 2) => `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Lê "1.234,56", "1234.56" ou "1234" como número. */
export function lerValor(s: string): number {
  const t = s.trim().replace(/[R$\s]/g, "");
  if (!t) return NaN;
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  return Number(normal);
}

export function lerData(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : null;
}

// ---------------------------------------------------------------- INSS e IR

export function inssEmpregado(salario: number) {
  let resto = 0;
  let total = 0;
  for (const [limite, aliq] of PARAMETROS.inss) {
    if (salario <= resto) break;
    total += (Math.min(salario, limite) - resto) * aliq;
    resto = limite;
  }
  return r2(total);
}

export function simularIRMensal({ bruto, dependentes = 0, pensao = 0 }: { bruto: number; dependentes?: number; pensao?: number }) {
  const P = PARAMETROS;
  const inss = inssEmpregado(bruto);
  const deducoesLegais = inss + dependentes * P.irrfDependente + pensao;
  const usaSimplificado = P.irrfDescontoSimplificado > deducoesLegais;
  const deducoes = Math.max(deducoesLegais, P.irrfDescontoSimplificado);
  const base = Math.max(0, bruto - deducoes);
  const [, aliquota, parcela] = P.irrf.find(([lim]) => base <= lim)!;
  const impostoTabela = Math.max(0, r2(base * aliquota - parcela));
  const R = P.irrfReducao;
  let reducao = 0;
  if (bruto <= R.isencaoAte) reducao = Math.min(impostoTabela, R.reducaoMaxima);
  else if (bruto <= R.faixaAte) reducao = Math.max(0, Math.min(impostoTabela, r2(R.a - R.b * bruto)));
  const imposto = r2(impostoTabela - reducao);
  return {
    inss, deducoes: r2(deducoes), usaSimplificado, base: r2(base), aliquota, impostoTabela, reducao: r2(reducao), imposto,
    aliquotaEfetiva: bruto > 0 ? imposto / bruto : 0,
    liquido: r2(bruto - inss - imposto - pensao),
  };
}

// ---------------------------------------------------------------- Rescisão

export type MotivoRescisao = "sem_justa_causa" | "pedido_demissao" | "justa_causa" | "acordo";

/** Avos (meses) entre duas datas: fração de 15 dias ou mais conta como mês inteiro. */
export function avos(inicio: Date, fim: Date) {
  if (fim < inicio) return 0;
  let meses = 0;
  while (addMonths(inicio, meses + 1) <= addDays1(fim)) meses++;
  const resto = differenceInCalendarDays(addDays1(fim), addMonths(inicio, meses));
  return Math.min(12, meses + (resto >= 15 ? 1 : 0));
}
const addDays1 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12);

export function calcularRescisao({
  salario, admissao, saida, motivo, avisoIndenizado, feriasVencidas, saldoFgts,
}: {
  salario: number; admissao: Date; saida: Date; motivo: MotivoRescisao; avisoIndenizado: boolean; feriasVencidas: number; saldoFgts?: number;
}) {
  const anos = differenceInYears(saida, admissao);
  const diasAviso = Math.min(90, 30 + 3 * anos);
  const temAvisoIndenizado = avisoIndenizado && (motivo === "sem_justa_causa" || motivo === "acordo");
  const diasAvisoPagos = temAvisoIndenizado ? (motivo === "acordo" ? diasAviso / 2 : diasAviso) : 0;
  // O aviso indenizado projeta o fim do contrato para o cálculo de 13º e férias (CLT, art. 487, §1º).
  const fimProjetado = temAvisoIndenizado ? new Date(saida.getFullYear(), saida.getMonth(), saida.getDate() + diasAviso, 12) : saida;

  const itens: { rotulo: string; valor: number; detalhe?: string }[] = [];
  const diasNoMes = saida.getDate();
  itens.push({ rotulo: "Saldo de salário", valor: r2((salario / 30) * Math.min(30, diasNoMes)), detalhe: `${Math.min(30, diasNoMes)} dia(s) trabalhados no mês` });

  if (diasAvisoPagos > 0) {
    itens.push({ rotulo: "Aviso prévio indenizado", valor: r2((salario / 30) * diasAvisoPagos), detalhe: `${diasAvisoPagos} dias${motivo === "acordo" ? " (metade, por acordo)" : ""}` });
  }

  if (motivo !== "justa_causa") {
    const inicioAno = new Date(fimProjetado.getFullYear(), 0, 1, 12);
    const m13 = avos(admissao > inicioAno ? admissao : inicioAno, fimProjetado);
    itens.push({ rotulo: "13º salário proporcional", valor: r2((salario / 12) * m13), detalhe: `${m13}/12 avos` });

    let inicioPeriodo = admissao;
    while (addYears(inicioPeriodo, 1) <= fimProjetado) inicioPeriodo = addYears(inicioPeriodo, 1);
    const mFerias = avos(inicioPeriodo, fimProjetado);
    const ferias = (salario / 12) * mFerias;
    itens.push({ rotulo: "Férias proporcionais + 1/3", valor: r2(ferias * (4 / 3)), detalhe: `${mFerias}/12 avos` });
  }

  if (feriasVencidas > 0) {
    itens.push({ rotulo: "Férias vencidas + 1/3", valor: r2(salario * feriasVencidas * (4 / 3)), detalhe: `${feriasVencidas} período(s)` });
  }

  const mesesTrabalhados = Math.max(1, Math.round(differenceInCalendarDays(saida, admissao) / 30.44));
  const fgtsEstimado = saldoFgts === undefined || Number.isNaN(saldoFgts);
  const fgts = fgtsEstimado ? r2(salario * 0.08 * mesesTrabalhados * (13 + 1 / 3) / 12) : saldoFgts!;
  const percMulta = motivo === "sem_justa_causa" ? 0.4 : motivo === "acordo" ? 0.2 : 0;
  if (percMulta > 0) {
    itens.push({ rotulo: `Multa do FGTS (${percMulta * 100}%)`, valor: r2(fgts * percMulta), detalhe: fgtsEstimado ? "sobre saldo estimado" : "sobre o saldo informado" });
  }

  const total = r2(itens.reduce((s, i) => s + i.valor, 0));
  const saqueFgts = motivo === "sem_justa_causa" ? "100% do saldo" : motivo === "acordo" ? "até 80% do saldo" : "não pode sacar nesta situação";
  const seguroDesemprego = motivo === "sem_justa_causa";
  return { itens, total, fgts, fgtsEstimado, saqueFgts, seguroDesemprego, diasAviso };
}

// ---------------------------------------------------------------- Juros e multa

export function atualizarDivida({
  valor, vencimento, pagamento, multaPct, jurosMesPct, correcaoPct = 0,
}: { valor: number; vencimento: Date; pagamento: Date; multaPct: number; jurosMesPct: number; correcaoPct?: number }) {
  const dias = Math.max(0, differenceInCalendarDays(pagamento, vencimento));
  if (dias === 0) return { dias, correcao: 0, multa: 0, juros: 0, total: valor };
  const correcao = r2(valor * (correcaoPct / 100));
  const corrigido = valor + correcao;
  const multa = r2(corrigido * (multaPct / 100));
  const juros = r2(corrigido * (jurosMesPct / 100) * (dias / 30));
  return { dias, correcao, multa, juros, total: r2(corrigido + multa + juros) };
}

/** Tributo federal pago em atraso: multa de 0,33% ao dia (máx. 20%) e juros Selic acumulada + 1% no mês do pagamento. */
export function tributoEmAtraso({ valor, vencimento, pagamento, selicAcumuladaPct }: { valor: number; vencimento: Date; pagamento: Date; selicAcumuladaPct: number }) {
  const dias = Math.max(0, differenceInCalendarDays(pagamento, vencimento));
  if (dias === 0) return { dias, multaPct: 0, multa: 0, jurosPct: 0, juros: 0, total: valor };
  const multaPct = Math.min(0.2, 0.0033 * dias);
  const mesmoMes = pagamento.getFullYear() === vencimento.getFullYear() && pagamento.getMonth() === vencimento.getMonth();
  const jurosPct = mesmoMes ? 0 : (selicAcumuladaPct + 1) / 100;
  const multa = r2(valor * multaPct);
  const juros = r2(valor * jurosPct);
  return { dias, multaPct, multa, jurosPct, juros, total: r2(valor + multa + juros) };
}

// ---------------------------------------------------------------- Pensão

export function simularPensao({ renda, percentual, semVinculo }: { renda: number; percentual: number; semVinculo: boolean }) {
  const base = semVinculo ? PARAMETROS.salarioMinimo : renda;
  return { base, mensal: r2(base * (percentual / 100)), anual: r2(base * (percentual / 100) * (semVinculo ? 12 : 13)) };
}

// ---------------------------------------------------------------- MEI

export type AtividadeMei = "comercio" | "servicos" | "ambos";

export function calcularMei({ atividade, faturadoNoAno, mesAbertura }: { atividade: AtividadeMei; faturadoNoAno: number; mesAbertura?: number }) {
  const P = PARAMETROS.mei;
  const inss = r2(PARAMETROS.salarioMinimo * P.inssPercentual);
  const icms = atividade !== "servicos" ? P.icms : 0;
  const iss = atividade !== "comercio" ? P.iss : 0;
  const das = r2(inss + icms + iss);
  const meses = mesAbertura ? 13 - mesAbertura : 12;
  const limite = (P.limiteAnual / 12) * meses;
  const uso = limite > 0 ? faturadoNoAno / limite : 0;
  const situacao: "ok" | "atencao" | "excesso_ate_20" | "excesso_acima_20" =
    uso <= 0.8 ? "ok" : uso <= 1 ? "atencao" : uso <= 1.2 ? "excesso_ate_20" : "excesso_acima_20";
  return { das, inss, icms, iss, limite: r2(limite), uso, situacao, restante: r2(Math.max(0, limite - faturadoNoAno)) };
}

// ---------------------------------------------------------------- Simples Nacional

const FAIXAS = [180000, 360000, 720000, 1800000, 3600000, 4800000];
export const ANEXOS = {
  I: { nome: "Anexo I · Comércio", tabela: [[0.04, 0], [0.073, 5940], [0.095, 13860], [0.107, 22500], [0.143, 87300], [0.19, 378000]] },
  II: { nome: "Anexo II · Indústria", tabela: [[0.045, 0], [0.078, 5940], [0.1, 13860], [0.112, 22500], [0.147, 85500], [0.3, 720000]] },
  III: { nome: "Anexo III · Serviços (ex.: manutenção, agências, academias)", tabela: [[0.06, 0], [0.112, 9360], [0.135, 17640], [0.16, 35640], [0.21, 125640], [0.33, 648000]] },
  IV: { nome: "Anexo IV · Serviços (ex.: limpeza, vigilância, obras)", tabela: [[0.045, 0], [0.09, 8100], [0.102, 12420], [0.14, 39780], [0.22, 183780], [0.33, 828000]] },
  V: { nome: "Anexo V · Serviços intelectuais (ex.: tecnologia, engenharia)", tabela: [[0.155, 0], [0.18, 4500], [0.195, 9900], [0.205, 17100], [0.23, 62100], [0.305, 540000]] },
} as const;
export type Anexo = keyof typeof ANEXOS;

export function simularSimples({ anexo, rbt12, faturamentoMes, folha12 }: { anexo: Anexo; rbt12: number; faturamentoMes: number; folha12?: number }) {
  if (rbt12 > FAIXAS[FAIXAS.length - 1]) return { foraDoLimite: true as const };
  // Fator R: serviço do Anexo V com folha ≥ 28% da receita é tributado pelo Anexo III.
  const fatorR = anexo === "V" && folha12 !== undefined && rbt12 > 0 ? folha12 / rbt12 : undefined;
  const anexoAplicado: Anexo = fatorR !== undefined && fatorR >= 0.28 ? "III" : anexo;
  const faixa = rbt12 <= 0 ? 0 : FAIXAS.findIndex((f) => rbt12 <= f);
  const [nominal, deduzir] = ANEXOS[anexoAplicado].tabela[faixa];
  const efetiva = rbt12 <= 0 ? nominal : (rbt12 * nominal - deduzir) / rbt12;
  return { foraDoLimite: false as const, anexoAplicado, fatorR, faixa: faixa + 1, nominal, efetiva, das: r2(faturamentoMes * efetiva) };
}

// ---------------------------------------------------------------- Custo de funcionário

export type Regime = "mei" | "simples" | "simples_iv" | "lucro";
export const REGIMES: Record<Regime, string> = {
  mei: "MEI (contribui 3% de INSS sobre o salário)",
  simples: "Simples Nacional (Anexos I, II, III ou V)",
  simples_iv: "Simples Nacional (Anexo IV)",
  lucro: "Lucro Presumido ou Real",
};

export function custoFuncionario({ salario, regime, beneficios }: { salario: number; regime: Regime; beneficios: number }) {
  const decimo = salario / 12;
  const tercoFerias = salario / 36; // o salário das férias já está nos 12 meses; o adicional é 1/3 por ano
  const base = salario + decimo + tercoFerias;
  const fgts = base * 0.08;
  const inssPatronalPct = { mei: 0.03, simples: 0, simples_iv: 0.22, lucro: 0.278 }[regime];
  const inss = base * inssPatronalPct;
  const mensal = r2(base + fgts + inss + beneficios);
  return {
    itens: [
      { rotulo: "Salário", valor: r2(salario) },
      { rotulo: "13º salário (provisão mensal)", valor: r2(decimo) },
      { rotulo: "1/3 de férias (provisão mensal)", valor: r2(tercoFerias) },
      { rotulo: "FGTS (8%)", valor: r2(fgts) },
      { rotulo: `INSS patronal${inssPatronalPct ? ` (${pct(inssPatronalPct, 1)})` : " (incluído no DAS)"}`, valor: r2(inss) },
      { rotulo: "Benefícios (vale-transporte, alimentação...)", valor: r2(beneficios) },
    ],
    mensal,
    anual: r2(mensal * 12),
    multiplicador: salario > 0 ? mensal / salario : 0,
  };
}

// ---------------------------------------------------------------- Valor por extenso (recibos)

const UN = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CT = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), d = n % 100;
  const partes = [];
  if (c) partes.push(CT[c]);
  if (d < 20) { if (d) partes.push(UN[d]); }
  else { partes.push(DZ[Math.floor(d / 10)] + (d % 10 ? ` e ${UN[d % 10]}` : "")); }
  return partes.join(" e ");
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const grupos: [number, string, string][] = [[1e9, "bilhão", "bilhões"], [1e6, "milhão", "milhões"], [1e3, "mil", "mil"], [1, "", ""]];
  const partes: string[] = [];
  let ultimoGrupo = 0;
  let resto = n;
  for (const [div, sing, plur] of grupos) {
    const q = Math.floor(resto / div);
    resto %= div;
    if (!q) continue;
    ultimoGrupo = q;
    if (div === 1e3) partes.push(q === 1 ? "mil" : `${ate999(q)} mil`);
    else if (div === 1) partes.push(ate999(q));
    else partes.push(`${ate999(q)} ${q === 1 ? sing : plur}`);
  }
  // "e" antes do último grupo quando ele é < 100 ou centena redonda
  // (ex.: "mil e cem", "dois mil e trinta", "dois milhões e quinhentos mil").
  if (partes.length > 1 && (ultimoGrupo < 100 || ultimoGrupo % 100 === 0)) {
    return partes.slice(0, -1).join(", ") + " e " + partes[partes.length - 1];
  }
  return partes.join(", ");
}

export function valorPorExtenso(valor: number): string {
  const centavosTotais = Math.round(valor * 100);
  const reais = Math.floor(centavosTotais / 100);
  const centavos = centavosTotais % 100;
  const partes: string[] = [];
  if (reais > 0) {
    const ext = inteiroPorExtenso(reais);
    const de = reais >= 1e6 && reais % 1e6 === 0 ? " de" : "";
    partes.push(`${ext}${de} ${reais === 1 ? "real" : "reais"}`);
  }
  if (centavos > 0) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  return partes.length ? partes.join(" e ") : "zero real";
}
