import Anthropic from "@anthropic-ai/sdk";
import type { ContextoModelo } from "./modelos";
import { valoresVariaveis } from "./modelos";

export const iaDisponivel = () => Boolean(process.env.ANTHROPIC_API_KEY);

const SISTEMA = `Você é um(a) advogado(a) brasileiro(a) experiente que redige peças processuais e documentos jurídicos.

Regras:
- Escreva em português do Brasil, em linguagem jurídica formal, clara e objetiva.
- Siga a estrutura usual da peça pedida (endereçamento, qualificação, fatos, fundamentos, pedidos, valor da causa, fecho), conforme o CPC, a CLT ou a legislação aplicável.
- Use os dados do cliente e do processo fornecidos. Quando faltar uma informação necessária, insira um marcador entre colchetes, ex.: [DATA DO FATO], em vez de inventar.
- Ao citar lei, cite apenas dispositivos que você tem certeza de que existem. Não invente jurisprudência, números de processos, ementas ou súmulas; se for útil citar precedente, deixe um marcador [INSERIR PRECEDENTE SOBRE ...] para o advogado completar.
- Responda somente com o texto final da peça, em texto puro (sem markdown, sem comentários antes ou depois).`;

export type PedidoIA = {
  tipoPeca: string;
  instrucoes: string;
  contexto: ContextoModelo;
};

function montarContexto({ contexto }: PedidoIA) {
  const v = valoresVariaveis(contexto);
  const linhas = Object.entries(v)
    .filter(([, valor]) => valor)
    .map(([chave, valor]) => `- ${chave}: ${valor}`);
  if (contexto.processo?.observacoes) linhas.push(`- processo.observacoes: ${contexto.processo.observacoes}`);
  if (contexto.cliente?.observacoes) linhas.push(`- cliente.observacoes: ${contexto.cliente.observacoes}`);
  return linhas.join("\n");
}

/** Gera a minuta de uma peça jurídica. Lança erro com mensagem amigável em caso de falha. */
export async function gerarPecaComIA(pedido: PedidoIA): Promise<string> {
  if (!iaDisponivel()) throw new Error("Configure ANTHROPIC_API_KEY no arquivo .env para usar a IA.");
  const client = new Anthropic();

  const conteudo = `Redija a seguinte peça: ${pedido.tipoPeca}

Dados disponíveis do cliente, processo e escritório:
${montarContexto(pedido) || "(nenhum dado cadastrado)"}

Instruções e fatos informados pelo advogado:
${pedido.instrucoes || "(nenhuma instrução adicional)"}`;

  try {
    const stream = client.beta.messages.stream({
      model: "claude-opus-5-5",
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      // Se o modelo recusar por política, o próprio servidor tenta outro modelo.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SISTEMA,
      messages: [{ role: "user", content: conteudo }],
    });
    const resposta = await stream.finalMessage();

    if (resposta.stop_reason === "refusal") {
      throw new Error("A IA não pôde gerar esta peça. Revise as instruções e tente novamente.");
    }
    const texto = resposta.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!texto) throw new Error("A IA não retornou texto. Tente novamente.");
    if (resposta.stop_reason === "max_tokens") return `${texto}\n\n[TEXTO INTERROMPIDO – a peça ficou longa demais; revise o final.]`;
    return texto;
  } catch (erro) {
    if (erro instanceof Anthropic.AuthenticationError) throw new Error("Chave da API da Anthropic inválida. Verifique ANTHROPIC_API_KEY.");
    if (erro instanceof Anthropic.RateLimitError) throw new Error("Limite de uso da IA atingido. Aguarde um pouco e tente de novo.");
    if (erro instanceof Anthropic.APIConnectionError) throw new Error("Não foi possível conectar à IA. Verifique a internet.");
    if (erro instanceof Anthropic.APIError) throw new Error(`Erro da IA (${erro.status}): ${erro.message}`);
    throw erro;
  }
}
