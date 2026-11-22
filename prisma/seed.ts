import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const FASES: [string, string[]][] = [
  ["Marketing", ["Análise de resultados", "Planejamento", "Produção", "Promoção", "Relacionamento"]],
  ["Negociação", ["Primeiro contato", "Reunião agendada", "Proposta enviada", "Contrato assinado"]],
  ["Consultoria", ["Em análise", "Parecer em elaboração", "Parecer entregue"]],
  ["Administrativo", ["Requerimento", "Em análise no órgão", "Exigência", "Decisão"]],
  ["Judicial", ["Petição inicial", "Citação", "Contestação", "Instrução", "Sentença"]],
  ["Recursal", ["Prazo recursal", "Recurso interposto", "Contrarrazões", "Julgamento"]],
  ["Execução", ["Cumprimento de sentença", "Cálculos", "Penhora", "Alvará"]],
  ["Financeiro", ["Cobrança de honorários", "Acordo de pagamento", "Quitado"]],
  ["Arquivamento", ["Arquivado"]],
];

const MODELOS = [
  {
    titulo: "Procuração ad judicia",
    categoria: "Procuração",
    area: "Geral",
    conteudo: `PROCURAÇÃO AD JUDICIA ET EXTRA

OUTORGANTE: {{cliente.qualificacao}}.

OUTORGADO: {{advogado.nome}}, advogado(a) inscrito(a) na OAB sob o nº {{advogado.oab}}, com escritório em {{escritorio.endereco}}.

PODERES: pelo presente instrumento, o(a) outorgante nomeia e constitui o(a) outorgado(a) seu(sua) bastante procurador(a), conferindo-lhe os poderes da cláusula ad judicia et extra para o foro em geral, em qualquer juízo, instância ou tribunal, podendo propor as ações competentes e defendê-lo(a) nas contrárias, seguindo umas e outras até final decisão, usando dos recursos legais e acompanhando-os, conferindo-lhe ainda poderes especiais para confessar, desistir, transigir, firmar compromissos ou acordos, receber e dar quitação, substabelecer com ou sem reserva de poderes, e praticar todos os demais atos necessários ao fiel cumprimento deste mandato.

{{cliente.endereco_completo}}, {{data.extenso}}.


_____________________________________
{{cliente.nome}}`,
  },
  {
    titulo: "Contrato de honorários advocatícios",
    categoria: "Contrato",
    area: "Geral",
    conteudo: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS

CONTRATANTE: {{cliente.qualificacao}}.

CONTRATADO: {{escritorio.nome}}, neste ato representado por {{advogado.nome}}, OAB nº {{advogado.oab}}.

CLÁUSULA 1ª – DO OBJETO. O CONTRATADO prestará serviços advocatícios ao CONTRATANTE relativos a: {{processo.titulo}}.

CLÁUSULA 2ª – DOS HONORÁRIOS. Pelos serviços, o CONTRATANTE pagará ao CONTRATADO o valor de {{processo.honorarios}}, sem prejuízo dos honorários de sucumbência, que pertencem exclusivamente ao CONTRATADO (art. 23 da Lei nº 8.906/94).

CLÁUSULA 3ª – DAS DESPESAS. Custas processuais, emolumentos e demais despesas correrão por conta do CONTRATANTE.

CLÁUSULA 4ª – DA RESCISÃO. O presente contrato poderá ser rescindido por qualquer das partes mediante comunicação por escrito, sendo devidos os honorários proporcionais aos serviços já prestados.

CLÁUSULA 5ª – DO FORO. Fica eleito o foro da comarca de {{processo.comarca}} para dirimir quaisquer dúvidas oriundas deste contrato.

{{data.extenso}}.


_____________________________________          _____________________________________
CONTRATANTE                                               CONTRATADO`,
  },
  {
    titulo: "Declaração de hipossuficiência",
    categoria: "Declaração",
    area: "Geral",
    conteudo: `DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA

Eu, {{cliente.qualificacao}}, DECLARO, para os fins do art. 99 do Código de Processo Civil e do art. 5º, LXXIV, da Constituição Federal, que não possuo condições de arcar com as custas processuais e honorários advocatícios sem prejuízo do meu próprio sustento e de minha família, razão pela qual requeiro os benefícios da gratuidade da justiça.

Declaro estar ciente de que a falsidade desta declaração pode ensejar as sanções civis e criminais cabíveis.

{{data.extenso}}.


_____________________________________
{{cliente.nome}}`,
  },
  {
    titulo: "Petição inicial – estrutura básica (cível)",
    categoria: "Petição",
    area: "Cível",
    conteudo: `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA {{processo.vara}} DA COMARCA DE {{processo.comarca}}




{{cliente.qualificacao}}, por seu(sua) advogado(a) que esta subscreve (procuração anexa), vem, respeitosamente, à presença de Vossa Excelência, propor a presente

{{processo.tipo_acao}}

em face de {{processo.parte_contraria}}, pelos fatos e fundamentos a seguir expostos.

I – DA GRATUIDADE DA JUSTIÇA

O(A) Autor(a) declara não possuir condições de arcar com as custas do processo sem prejuízo do próprio sustento, nos termos do art. 98 e seguintes do CPC, conforme declaração anexa.

II – DOS FATOS

[Descreva aqui, de forma cronológica e objetiva, os fatos que fundamentam o pedido.]

III – DO DIREITO

[Exponha os fundamentos jurídicos: dispositivos legais, doutrina e jurisprudência aplicáveis.]

IV – DOS PEDIDOS

Diante do exposto, requer:

a) a concessão dos benefícios da gratuidade da justiça;
b) a citação do(a) Réu(Ré) para, querendo, apresentar contestação, sob pena de revelia;
c) a total procedência dos pedidos para [especificar];
d) a condenação do(a) Réu(Ré) ao pagamento das custas processuais e honorários advocatícios;
e) a produção de todas as provas em direito admitidas.

Dá-se à causa o valor de {{processo.valor_causa}} ({{processo.valor_causa_extenso}}).

Nestes termos,
pede deferimento.

{{data.extenso}}.


{{advogado.nome}}
OAB {{advogado.oab}}`,
  },
];

async function main() {
  const existente = await db.usuario.findFirst();
  if (existente) {
    console.log("Banco já tem dados; seed ignorado.");
    return;
  }

  const escritorio = await db.escritorio.create({
    data: { nome: "Escritório Modelo Advocacia", endereco: "Belo Horizonte/MG" },
  });

  const admin = await db.usuario.create({
    data: {
      nome: "Ana Exemplo",
      email: "admin@escritoriomodelo.adv.br",
      senhaHash: await bcrypt.hash("modelo123", 10),
      papel: "ADMIN",
      oab: "SP 000.000",
      metaPontos: 50,
      escritorioId: escritorio.id,
    },
  });

  let primeiraEtapa: string | null = null;
  for (const [i, [nome, etapas]] of FASES.entries()) {
    const fase = await db.fase.create({ data: { nome, ordem: i, escritorioId: escritorio.id } });
    for (const [j, etapa] of etapas.entries()) {
      const e = await db.etapa.create({ data: { nome: etapa, ordem: j, faseId: fase.id } });
      if (nome === "Judicial" && j === 0) primeiraEtapa = e.id;
    }
  }

  const [contaPrincipal] = await Promise.all(
    ["Conta Principal", "Dinheiro", "Investimentos"].map((nome) =>
      db.contaBancaria.create({ data: { nome, escritorioId: escritorio.id } }),
    ),
  );

  const receitas = ["Honorários contratuais", "Honorários de êxito", "Honorários de sucumbência", "Consultoria", "Reembolso de custas"];
  const despesas = ["Aluguel", "Salários", "Custas processuais", "Software e sistemas", "Impostos", "Marketing", "Outras despesas"];
  const categorias = await Promise.all([
    ...receitas.map((nome) => db.categoriaFinanceira.create({ data: { nome, tipo: "RECEITA", escritorioId: escritorio.id } })),
    ...despesas.map((nome) => db.categoriaFinanceira.create({ data: { nome, tipo: "DESPESA", escritorioId: escritorio.id } })),
  ]);

  for (const m of MODELOS) await db.modelo.create({ data: { ...m, escritorioId: escritorio.id } });

  // Dados de exemplo para o sistema não abrir vazio.
  const cliente = await db.cliente.create({
    data: {
      nome: "Maria da Silva (exemplo)",
      tipo: "PF",
      documento: "52998224725",
      nacionalidade: "brasileira",
      estadoCivil: "casada",
      profissao: "professora",
      email: "maria@exemplo.com",
      celular: "(11) 99999-0000",
      endereco: "Rua das Flores",
      numero: "123",
      bairro: "Jardim Primavera",
      cidade: "São Paulo",
      uf: "SP",
      cep: "01000-000",
      origem: "Indicação",
      escritorioId: escritorio.id,
    },
  });

  const processo = await db.processo.create({
    data: {
      titulo: "Ação de indenização por danos morais",
      tipoAcao: "AÇÃO DE INDENIZAÇÃO POR DANOS MORAIS",
      numero: "00012345620268260100",
      area: "Cível",
      tribunal: "TJSP",
      vara: "1ª Vara Cível",
      comarca: "São Paulo",
      parteContraria: "Empresa Exemplo Ltda.",
      posicaoCliente: "Autor",
      valorCausa: 15000,
      honorarios: 3000,
      honorariosExito: 20,
      clienteId: cliente.id,
      responsavelId: admin.id,
      etapaId: primeiraEtapa,
      escritorioId: escritorio.id,
    },
  });

  await db.andamento.create({ data: { processoId: processo.id, descricao: "Processo cadastrado no sistema." } });

  const amanha = new Date(Date.now() + 86400000);
  await db.tarefa.createMany({
    data: [
      { titulo: "Boas-vindas! Cadastre os clientes do escritório", escritorioId: escritorio.id, responsavelId: admin.id, criadorId: admin.id, prazo: new Date() },
      { titulo: "Elaborar petição inicial", tipo: "PETICAO", prioridade: "ALTA", pontos: 5, escritorioId: escritorio.id, responsavelId: admin.id, criadorId: admin.id, processoId: processo.id, prazo: amanha },
    ],
  });

  await db.evento.create({
    data: {
      titulo: "Reunião com a cliente Maria",
      tipo: "REUNIAO",
      inicio: new Date(amanha.setHours(14, 0, 0, 0)),
      escritorioId: escritorio.id,
      usuarioId: admin.id,
      processoId: processo.id,
    },
  });

  const honorarios = categorias.find((c) => c.nome === "Honorários contratuais")!;
  await db.lancamento.create({
    data: {
      tipo: "RECEITA",
      descricao: "Honorários – 1ª parcela",
      valor: 1500,
      vencimento: new Date(),
      contaId: contaPrincipal.id,
      categoriaId: honorarios.id,
      clienteId: cliente.id,
      processoId: processo.id,
      escritorioId: escritorio.id,
    },
  });

  console.log("Seed concluído. Login: admin@escritoriomodelo.adv.br / modelo123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
