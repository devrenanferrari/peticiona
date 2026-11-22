// Identidade do escritório que usa este sistema.
// Para replicar o sistema para outro escritório, troque os dados deste arquivo
// (e o conteúdo do site em src/site/config.ts). Nenhum outro arquivo cita o nome.

export const MARCA = {
  /** Nome curto, usado no menu, no login e nas abas do navegador. */
  nome: "Escritório Modelo",
  /** Linha abaixo do nome no monograma e no rodapé. */
  sufixo: "Advocacia",
  nomeCompleto: "Escritório Modelo Advocacia",
  /** Letras do monograma, separadas pelo "&". */
  monograma: ["E", "M"] as const,
  /** Cor de destaque da marca (hex). Usada em ícones, foco, seleção e gráficos. */
  cor: "#0a6ed1",
  cidade: "Belo Horizonte",
  uf: "MG",
  /** Símbolo branco do logotipo, usado na barra superior do sistema. */
  simbolo: "/marca/simbolo.png",
  /** Nome do sistema interno exibido para a equipe. */
  sistema: "Sistema de Gestão",
};

/**
 * Permite criar novos escritórios pela tela de login (modo plataforma, vários escritórios).
 * Desligado por padrão: o sistema fica dedicado ao escritório acima.
 */
export const PERMITIR_CADASTRO = process.env.PERMITIR_CADASTRO === "1";
