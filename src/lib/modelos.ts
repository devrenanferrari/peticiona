import type { Cliente, Escritorio, Processo, Usuario } from "@prisma/client";
import { brl, fmtCNJ, fmtData, fmtDocumento, porExtenso } from "./format";

export type ContextoModelo = {
  cliente?: Cliente | null;
  processo?: Processo | null;
  escritorio?: Escritorio | null;
  advogado?: Usuario | null;
};

/** Variáveis disponíveis nos modelos, agrupadas para exibir no editor. */
export const VARIAVEIS: Record<string, [string, string][]> = {
  Cliente: [
    ["cliente.nome", "Nome completo"],
    ["cliente.documento", "CPF/CNPJ"],
    ["cliente.rg", "RG"],
    ["cliente.nacionalidade", "Nacionalidade"],
    ["cliente.estado_civil", "Estado civil"],
    ["cliente.profissao", "Profissão"],
    ["cliente.email", "E-mail"],
    ["cliente.telefone", "Telefone"],
    ["cliente.endereco_completo", "Endereço completo"],
    ["cliente.qualificacao", "Qualificação completa"],
  ],
  Processo: [
    ["processo.numero", "Número CNJ"],
    ["processo.titulo", "Título"],
    ["processo.tipo_acao", "Tipo de ação"],
    ["processo.vara", "Vara"],
    ["processo.comarca", "Comarca"],
    ["processo.tribunal", "Tribunal"],
    ["processo.parte_contraria", "Parte contrária"],
    ["processo.valor_causa", "Valor da causa"],
    ["processo.valor_causa_extenso", "Valor da causa por extenso"],
    ["processo.honorarios", "Honorários"],
  ],
  Escritório: [
    ["escritorio.nome", "Nome do escritório"],
    ["escritorio.endereco", "Endereço"],
    ["advogado.nome", "Advogado responsável"],
    ["advogado.oab", "OAB do advogado"],
  ],
  Datas: [
    ["data.hoje", "Data de hoje (dd/mm/aaaa)"],
    ["data.extenso", "Data de hoje por extenso"],
  ],
};

function enderecoCompleto(c: Cliente) {
  const partes = [
    [c.endereco, c.numero].filter(Boolean).join(", "),
    c.complemento,
    c.bairro,
    [c.cidade, c.uf].filter(Boolean).join("/"),
    c.cep ? `CEP ${c.cep}` : null,
  ].filter(Boolean);
  return partes.join(", ");
}

function qualificacao(c: Cliente) {
  if (c.tipo === "PJ") {
    return `${c.nome}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${fmtDocumento(c.documento)}, com sede em ${enderecoCompleto(c)}`;
  }
  const partes = [
    c.nome,
    c.nacionalidade,
    c.estadoCivil,
    c.profissao,
    c.rg ? `portador(a) do RG nº ${c.rg}` : null,
    c.documento ? `inscrito(a) no CPF sob o nº ${fmtDocumento(c.documento)}` : null,
    c.email ? `e-mail ${c.email}` : null,
    enderecoCompleto(c) ? `residente e domiciliado(a) em ${enderecoCompleto(c)}` : null,
  ].filter(Boolean);
  return partes.join(", ");
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function valoresVariaveis(ctx: ContextoModelo): Record<string, string> {
  const { cliente: c, processo: p, escritorio: e, advogado: a } = ctx;
  const hoje = new Date();
  const v: Record<string, string> = {
    "data.hoje": fmtData(hoje),
    "data.extenso": `${hoje.getDate()} de ${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}`,
  };
  if (c) {
    Object.assign(v, {
      "cliente.nome": c.nome,
      "cliente.documento": fmtDocumento(c.documento),
      "cliente.rg": c.rg ?? "",
      "cliente.nacionalidade": c.nacionalidade ?? "",
      "cliente.estado_civil": c.estadoCivil ?? "",
      "cliente.profissao": c.profissao ?? "",
      "cliente.email": c.email ?? "",
      "cliente.telefone": c.celular ?? c.telefone ?? "",
      "cliente.endereco_completo": enderecoCompleto(c),
      "cliente.qualificacao": qualificacao(c),
    });
  }
  if (p) {
    Object.assign(v, {
      "processo.numero": fmtCNJ(p.numero),
      "processo.titulo": p.titulo,
      "processo.tipo_acao": p.tipoAcao ?? "",
      "processo.vara": p.vara ?? "",
      "processo.comarca": p.comarca ?? "",
      "processo.tribunal": p.tribunal ?? "",
      "processo.parte_contraria": p.parteContraria ?? "",
      "processo.valor_causa": p.valorCausa != null ? brl(p.valorCausa) : "",
      "processo.valor_causa_extenso": p.valorCausa != null ? porExtenso(p.valorCausa) : "",
      "processo.honorarios": p.honorarios != null ? brl(p.honorarios) : "",
    });
  }
  if (e) Object.assign(v, { "escritorio.nome": e.nome, "escritorio.endereco": e.endereco ?? "" });
  if (a) Object.assign(v, { "advogado.nome": a.nome, "advogado.oab": a.oab ?? "" });
  return v;
}

/** Substitui {{variavel}}. Variáveis sem valor ficam marcadas como [[variavel]] para revisão. */
export function preencherModelo(conteudo: string, ctx: ContextoModelo) {
  const valores = valoresVariaveis(ctx);
  return conteudo.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, chave: string) => {
    const valor = valores[chave];
    return valor ? valor : `[[${chave}]]`;
  });
}
