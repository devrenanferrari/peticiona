// Cálculo de prazos processuais (CPC/2015).

const chave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const somarDias = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano: number) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia, 12);
}

/** Feriados nacionais e dias sem expediente forense em todo o país. */
export function feriadosNacionais(ano: number): Map<string, string> {
  const f = new Map<string, string>();
  const fixo = (m: number, d: number, nome: string) => f.set(chave(new Date(ano, m - 1, d)), nome);
  fixo(1, 1, "Confraternização Universal");
  fixo(4, 21, "Tiradentes");
  fixo(5, 1, "Dia do Trabalho");
  fixo(9, 7, "Independência do Brasil");
  fixo(10, 12, "Nossa Senhora Aparecida");
  fixo(11, 2, "Finados");
  fixo(11, 15, "Proclamação da República");
  fixo(11, 20, "Dia Nacional de Zumbi e da Consciência Negra");
  fixo(12, 25, "Natal");
  const p = pascoa(ano);
  f.set(chave(somarDias(p, -48)), "Carnaval (segunda-feira)");
  f.set(chave(somarDias(p, -47)), "Carnaval (terça-feira)");
  f.set(chave(somarDias(p, -2)), "Sexta-feira da Paixão");
  f.set(chave(somarDias(p, 60)), "Corpus Christi");
  return f;
}

/** Recesso forense: 20/12 a 20/01 (art. 220 do CPC) — prazos ficam suspensos. */
export const noRecesso = (d: Date) => (d.getMonth() === 11 && d.getDate() >= 20) || (d.getMonth() === 0 && d.getDate() <= 20);

export type DiaCalculo = { data: Date; conta: boolean; motivo?: string; numero?: number };
export type OpcoesPrazo = {
  inicio: Date; // data da intimação/publicação (ou disponibilização no DJe)
  dias: number;
  uteis: boolean; // true = dias úteis (CPC, art. 219); false = dias corridos
  disponibilizacao?: boolean; // a data informada é a disponibilização no DJe (Lei 11.419/06, art. 4º, §3º)
  recesso?: boolean;
  feriadosExtras?: Date[]; // feriados estaduais/municipais/suspensões do tribunal
};

export function calcularPrazo(o: OpcoesPrazo) {
  const feriados = new Map<string, string>();
  const anos = new Set([o.inicio.getFullYear(), o.inicio.getFullYear() + 1]);
  for (const a of anos) for (const [k, v] of feriadosNacionais(a)) feriados.set(k, v);
  for (const d of o.feriadosExtras ?? []) feriados.set(chave(d), "Feriado/suspensão informado");

  const motivoNaoUtil = (d: Date): string | undefined => {
    if (d.getDay() === 0) return "Domingo";
    if (d.getDay() === 6) return "Sábado";
    const f = feriados.get(chave(d));
    if (f) return f;
    if (o.recesso !== false && noRecesso(d)) return "Recesso forense";
    return undefined;
  };
  const proximoUtil = (d: Date) => {
    let r = somarDias(d, 1);
    while (motivoNaoUtil(r)) r = somarDias(r, 1);
    return r;
  };

  const inicio = new Date(o.inicio.getFullYear(), o.inicio.getMonth(), o.inicio.getDate(), 12);
  // Disponibilização no DJe: considera-se publicado no primeiro dia útil seguinte.
  const publicacao = o.disponibilizacao ? proximoUtil(inicio) : inicio;

  const linha: DiaCalculo[] = [];
  let contados = 0;
  let d = publicacao;
  // Exclui o dia do começo (art. 224): a contagem começa no dia útil seguinte.
  while (contados < o.dias) {
    d = somarDias(d, 1);
    const motivo = motivoNaoUtil(d);
    const suspenso = o.recesso !== false && noRecesso(d);
    const conta = o.uteis ? !motivo : !suspenso;
    if (conta) contados++;
    linha.push({ data: d, conta, motivo: conta ? undefined : motivo, numero: conta ? contados : undefined });
    if (linha.length > 800) break;
  }
  // Vencimento em dia não útil prorroga para o próximo dia útil (art. 224, §1º).
  let final = d;
  const prorrogado: DiaCalculo[] = [];
  while (motivoNaoUtil(final)) {
    prorrogado.push({ data: final, conta: false, motivo: `${motivoNaoUtil(final)} (prorrogação)` });
    final = somarDias(final, 1);
  }
  return { publicacao, final, linha, prorrogado, feriadosConsiderados: feriados };
}
