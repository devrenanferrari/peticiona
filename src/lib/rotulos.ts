import type { Tom } from "@/components/grade";

// Rótulo e cor de cada status, usados nas grades e formulários.
type Tabela = Record<string, [string, Tom]>;

export const STATUS_PROCESSO: Tabela = {
  ATIVO: ["Ativo", "verde"],
  SUSPENSO: ["Suspenso", "amarelo"],
  ENCERRADO: ["Encerrado", "cinza"],
  ARQUIVADO: ["Arquivado", "cinza"],
};

export const TIPO_AUDIENCIA: Record<string, string> = {
  CONCILIACAO: "Conciliação",
  INSTRUCAO: "Instrução",
  INSTRUCAO_JULGAMENTO: "Instrução e julgamento",
  UNA: "Una",
  JULGAMENTO: "Julgamento",
  OUTRA: "Outra",
};

export const MODALIDADE_AUDIENCIA: Record<string, string> = { PRESENCIAL: "Presencial", VIRTUAL: "Virtual", HIBRIDA: "Híbrida" };

export const STATUS_AUDIENCIA: Tabela = {
  DESIGNADA: ["Designada", "azul"],
  REALIZADA: ["Realizada", "verde"],
  REDESIGNADA: ["Redesignada", "amarelo"],
  CANCELADA: ["Cancelada", "cinza"],
};

export const STATUS_INICIAL: Tabela = {
  A_ELABORAR: ["A elaborar", "cinza"],
  AGUARDANDO_DOCUMENTOS: ["Aguardando documentos", "amarelo"],
  EM_ELABORACAO: ["Em elaboração", "azul"],
  REVISAO: ["Em revisão", "roxo"],
  PROTOCOLADA: ["Protocolada", "verde"],
  CANCELADA: ["Cancelada", "cinza"],
};

export const TIPO_REQUISICAO: Record<string, string> = { RPV: "RPV", PRECATORIO: "Precatório" };

export const STATUS_REQUISICAO: Tabela = {
  A_EXPEDIR: ["A expedir", "cinza"],
  EXPEDIDA: ["Expedida", "azul"],
  PAGA: ["Paga", "verde"],
  CANCELADA: ["Cancelada", "cinza"],
};

export const INSTANCIAS = ["1ª instância", "2ª instância", "Tribunais superiores", "Administrativa"];
/** Processos que aparecem na aba "2ª instância e tribunais". */
export const INSTANCIAS_RECURSAIS = ["2ª instância", "Tribunais superiores"];

export const RECURSOS = [
  "Apelação", "Agravo de instrumento", "Agravo interno", "Embargos de declaração", "Recurso ordinário", "Agravo de petição",
  "Recurso de revista", "Recurso especial", "Recurso extraordinário", "Recurso inominado", "Mandado de segurança", "Ação originária",
];

/** { texto, tom } para a célula de status da grade. */
export function status(tabela: Tabela, valor: string | null | undefined) {
  if (!valor) return null;
  const [texto, tom] = tabela[valor] ?? [valor, "cinza" as Tom];
  return { texto, tom };
}

export const opcoes = (tabela: Tabela | Record<string, string>): [string, string][] =>
  Object.entries(tabela).map(([v, r]) => [v, Array.isArray(r) ? r[0] : r]);

/** Valor que o escritório recebe de uma requisição (valor × % do contrato). */
export const parteEscritorio = (r: { valor: number; percentual: number | null }) => (r.percentual != null ? (r.valor * r.percentual) / 100 : r.valor);
