// Conteúdo público do site do escritório. A identidade (nome, cor, cidade) vem de src/marca.ts.
// Itens marcados com "PREENCHER" precisam dos dados reais antes de publicar.

import { MARCA } from "@/marca";

export const SITE = {
  nome: MARCA.nome,
  nomeCompleto: MARCA.nomeCompleto,
  slogan: "Advocacia empresarial e tributária",
  registroOab: "OAB/MG nº PREENCHER", // registro da sociedade de advogados
  cnpj: "00.000.000/0001-00" /* PREENCHER */,
  telefone: "(00) 00000-0000" /* PREENCHER */,
  whatsapp: "550000000000", // só números, com DDI 55
  email: "contato@escritoriomodelo.adv.br", // PREENCHER: confirmar e-mail
  cidade: `${MARCA.cidade} · ${MARCA.uf}`,
  endereco: "Belo Horizonte/MG", // PREENCHER: endereço completo, se quiser exibir
  horario: "Segunda a sexta, das 9h às 18h",
  instagram: "https://www.instagram.com/",
  instagramUsuario: "@escritoriomodelo",
};

export type Socio = {
  nome: string;
  /** Letra do monograma que o sócio representa (ex.: E de Exemplo, M de Modelo). */
  letra: string;
  /** Nome curto para títulos grandes. */
  curto: string;
  cargo: string;
  oab: string;
  instagram?: string;
  /** Foto em /public (ex.: "/socios/ana.jpg"), formato retrato 4:5. Sem foto, o site mostra o monograma. */
  foto?: string;
  bio: string;
};

export const SOCIOS: Socio[] = [
  {
    nome: "Ana Exemplo",
    letra: "E",
    curto: "Ana Exemplo",
    cargo: "Sócio fundador",
    oab: "OAB/MG PREENCHER",
    bio: "Conduz a estratégia jurídica de empresas em suas decisões societárias, contratuais e tributárias, do planejamento à execução.", // PREENCHER: bio real
  },
  {
    nome: "Bruno Modelo",
    letra: "M",
    curto: "Bruno Modelo",
    cargo: "Sócio fundador",
    oab: "OAB/MG PREENCHER",
    bio: "Atua no planejamento tributário e na defesa de empresas, traduzindo a legislação em decisões claras para a gestão.", // PREENCHER: bio real
  },
];

/** Equipe exibida abaixo dos sócios. Deixe vazio para mostrar só o texto. */
export const EQUIPE: { nome: string; funcao: string }[] = [
  // { nome: "Nome Sobrenome", funcao: "Advogada · Tributário" },
];

export const PRATICAS = [
  {
    id: "tributario",
    titulo: "Tributário",
    tese: "Menos carga, mais previsibilidade. Planejamento que acompanha o caixa da empresa.",
    servicos: [
      "Planejamento tributário",
      "Recuperação de créditos",
      "Revisão de enquadramento e regime",
      "Defesas administrativas",
      "Contencioso tributário",
    ],
  },
  {
    id: "empresarial",
    titulo: "Empresarial",
    tese: "Estrutura sólida para crescer: sociedade, contratos e decisões bem amarradas.",
    servicos: [
      "Societário e acordos de sócios",
      "Contratos empresariais",
      "Fusões, aquisições e due diligence",
      "Governança e sucessão",
      "Reestruturação de empresas",
    ],
  },
];

export const AREAS_SITE = [
  "Planejamento tributário",
  "Recuperação de créditos",
  "Contencioso tributário",
  "Societário",
  "Contratos",
  "Fusões e aquisições",
  "Reestruturação",
  "Outro assunto",
];
