const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });
const dataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

export const brl = (v: number | null | undefined) => moeda.format(v ?? 0);
export const fmtData = (d: Date | null | undefined) => (d ? data.format(d) : "—");
export const fmtDataHora = (d: Date | null | undefined) => (d ? dataHora.format(d) : "—");

/** Valor para <input type="date">. */
export const inputData = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
/** Valor para <input type="datetime-local"> no fuso local do servidor. */
export const inputDataHora = (d: Date | null | undefined) => {
  if (!d) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export function fmtDocumento(doc: string | null | undefined) {
  const n = (doc ?? "").replace(/\D/g, "");
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc ?? "";
}

/** Valida dígitos verificadores do CPF. */
export function cpfValido(cpf: string) {
  const n = cpf.replace(/\D/g, "");
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  const dv = (len: number) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(n[i]) * (len + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(n[9]) && dv(10) === Number(n[10]);
}

/** Número CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO */
export function fmtCNJ(numero: string | null | undefined) {
  const n = (numero ?? "").replace(/\D/g, "");
  if (n.length !== 20) return numero ?? "";
  return n.replace(/(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})/, "$1-$2.$3.$4.$5.$6");
}

export function porExtenso(valor: number): string {
  // Versão compacta para valores de causa/honorários (até bilhões).
  const u = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const d = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const c = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
  const ate999 = (n: number): string => {
    if (n === 100) return "cem";
    const partes: string[] = [];
    if (n >= 100) partes.push(c[Math.floor(n / 100)]);
    const r = n % 100;
    if (r >= 20) partes.push(d[Math.floor(r / 10)] + (r % 10 ? " e " + u[r % 10] : ""));
    else if (r > 0) partes.push(u[r]);
    return partes.join(" e ");
  };
  const grupos: [number, string, string][] = [
    [1e9, "bilhão", "bilhões"],
    [1e6, "milhão", "milhões"],
    [1e3, "mil", "mil"],
  ];
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);
  let resto = inteiro;
  // Cada parte guarda o valor do grupo (0–999) para decidir o conectivo.
  const partes: { texto: string; q: number }[] = [];
  for (const [base, sing, plur] of grupos) {
    const q = Math.floor(resto / base);
    if (q > 0) {
      partes.push({ texto: base === 1e3 && q === 1 ? "mil" : `${ate999(q)} ${q === 1 ? sing : plur}`, q });
      resto %= base;
    }
  }
  if (resto > 0) partes.push({ texto: ate999(resto), q: resto });
  // Usa "e" antes de grupo menor que 100 ou centena redonda ("mil e quinhentos"); senão, vírgula.
  let texto = partes.length
    ? partes.map((p, i) => (i === 0 ? "" : p.q < 100 || p.q % 100 === 0 ? " e " : ", ") + p.texto).join("")
    : "zero";
  // "um milhão de reais", "dois bilhões de reais"
  const terminaEmMilhao = inteiro >= 1e6 && inteiro % 1e6 === 0;
  texto += inteiro === 1 ? " real" : terminaEmMilhao ? " de reais" : " reais";
  const textoCentavos = `${ate999(centavos)} centavo${centavos === 1 ? "" : "s"}`;
  if (centavos && inteiro === 0) return textoCentavos;
  if (centavos) texto += ` e ${textoCentavos}`;
  return texto;
}

/** Data relativa a agora, deslocada em dias (negativo = passado). */
export function diasAPartirDeHoje(dias: number) {
  return new Date(new Date().getTime() + dias * 86400000);
}

/** Próxima hora cheia, para sugerir horário de compromisso. */
export function proximaHoraCheia() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}
