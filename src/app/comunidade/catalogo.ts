// Lista das ferramentas públicas. Usada pela página, pelo contador de uso e pelo painel interno.

export type Publico = "pf" | "pj";

export const FERRAMENTAS = [
  { id: "rescisao", publico: "pf", titulo: "Rescisão trabalhista", resumo: "Saldo de salário, aviso, férias, 13º e FGTS" },
  { id: "irpf", publico: "pf", titulo: "Imposto de Renda no salário", resumo: "Veja se é isento e quanto é descontado" },
  { id: "divida", publico: "pf", titulo: "Juros e multa de dívida", resumo: "Atualize contas e valores em atraso" },
  { id: "pensao", publico: "pf", titulo: "Pensão alimentícia", resumo: "Simulação de valores e como é definida" },
  { id: "consumidor", publico: "pf", titulo: "Reclamação do consumidor", resumo: "Monte uma reclamação com base no CDC" },
  { id: "glossario", publico: "pf", titulo: "Glossário jurídico", resumo: "Termos do Direito em linguagem simples" },
  { id: "mei", publico: "pj", titulo: "DAS e limite do MEI", resumo: "Valor do boleto e quanto ainda pode faturar" },
  { id: "simples", publico: "pj", titulo: "Simples Nacional", resumo: "Alíquota efetiva e valor do DAS" },
  { id: "funcionario", publico: "pj", titulo: "Custo de um funcionário", resumo: "Quanto custa contratar com carteira" },
  { id: "tributo", publico: "pj", titulo: "Imposto federal em atraso", resumo: "Multa e juros para pagar o DARF/DAS" },
  { id: "recibo", publico: "pj", titulo: "Gerador de recibo", resumo: "Recibo com valor por extenso, pronto para imprimir" },
  { id: "checklist-mei", publico: "pj", titulo: "Checklist do MEI", resumo: "Abrir, manter em dia e encerrar o MEI" },
] as const satisfies readonly { id: string; publico: Publico; titulo: string; resumo: string }[];

export type IdFerramenta = (typeof FERRAMENTAS)[number]["id"];
export const IDS = new Set<string>(FERRAMENTAS.map((f) => f.id));
