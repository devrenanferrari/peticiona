// Dados de demonstração para o sistema não parecer vazio. Rode: npm run demo
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const NOMES = [
  "Ana Paula Ribeiro", "Carlos Eduardo Mendes", "Fernanda Lima Costa", "Roberto Alves Pereira", "Juliana Martins",
  "Marcos Vinícius Rocha", "Patrícia Gomes", "Ricardo Nogueira", "Beatriz Carvalho", "Thiago Fernandes",
  "Construtora Horizonte Ltda.", "Padaria Pão Dourado ME", "Tech Soluções S.A.", "Luciana Barbosa", "Eduardo Santana",
  "Camila Duarte", "Rafael Moreira", "Gabriela Teixeira",
];
const CASOS: [string, string, string][] = [
  ["Reclamação trabalhista – horas extras", "Trabalhista", "TRT2"],
  ["Ação de alimentos", "Família", "TJSP"],
  ["Aposentadoria por tempo de contribuição", "Previdenciário", "TRF3"],
  ["Indenização por negativação indevida", "Consumidor", "TJSP"],
  ["Divórcio consensual", "Família", "TJSP"],
  ["Execução de título extrajudicial", "Cível", "TJSP"],
  ["Revisão de contrato bancário", "Bancário", "TJSP"],
  ["Mandado de segurança – ICMS", "Tributário", "TJSP"],
  ["Auxílio-doença negado", "Previdenciário", "TRF3"],
  ["Rescisão indireta", "Trabalhista", "TRT2"],
  ["Usucapião extraordinária", "Imobiliário", "TJSP"],
  ["Defesa em ação penal – estelionato", "Criminal", "TJSP"],
  ["Plano de saúde – negativa de cirurgia", "Saúde", "TJSP"],
  ["Despejo por falta de pagamento", "Imobiliário", "TJSP"],
  ["Inventário extrajudicial", "Família", "Cartório"],
  ["Cobrança de duplicatas", "Empresarial", "TJSP"],
  ["Danos morais – atraso de voo", "Consumidor", "JEC"],
  ["Recurso de multa de trânsito", "Administrativo", "DETRAN"],
  ["Guarda compartilhada", "Família", "TJSP"],
  ["Equiparação salarial", "Trabalhista", "TRT2"],
  ["BPC/LOAS – idoso", "Previdenciário", "TRF3"],
  ["Repetição de indébito – PIS/COFINS", "Tributário", "TRF3"],
];
const TAREFAS = [
  "Protocolar petição inicial", "Preparar contestação", "Reunião de alinhamento com cliente", "Juntar documentos pessoais",
  "Calcular verbas rescisórias", "Elaborar recurso de apelação", "Audiência de conciliação", "Cumprir diligência",
  "Enviar proposta de honorários", "Revisar contrato social", "Despachar com o juiz", "Acompanhar publicação",
];
const r = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(a: T[]) => a[r(a.length)];
const dias = (n: number) => new Date(Date.now() + n * 86400000);

async function main() {
  const escritorio = await db.escritorio.findFirstOrThrow({ orderBy: { criadoEm: "asc" } });
  const e = escritorio.id;
  if ((await db.cliente.count({ where: { escritorioId: e } })) > 10) {
    console.log("Já existem dados de demonstração.");
    return;
  }

  const admin = await db.usuario.findFirstOrThrow({ where: { escritorioId: e, papel: "ADMIN" } });
  await db.usuario.update({ where: { id: admin.id }, data: { nome: "Dra. Helena Ferraz", oab: "SP 245.871" } });
  const equipe = [admin];
  for (const [nome, email, papel] of [
    ["Dr. Paulo Azevedo", "paulo@escritoriomodelo.adv.br", "ADVOGADO"],
    ["Mariana Souza", "mariana@escritoriomodelo.adv.br", "ESTAGIARIO"],
  ]) {
    equipe.push(
      await db.usuario.upsert({
        where: { email },
        update: {},
        create: { nome, email, papel, senhaHash: await bcrypt.hash("modelo123", 10), escritorioId: e, metaPontos: 40 },
      }),
    );
  }

  const etapas = await db.etapa.findMany({ where: { fase: { escritorioId: e, nome: { in: ["Negociação", "Judicial", "Recursal", "Execução"] } } } });
  const contas = await db.contaBancaria.findMany({ where: { escritorioId: e } });
  const cats = await db.categoriaFinanceira.findMany({ where: { escritorioId: e } });
  const receitas = cats.filter((c) => c.tipo === "RECEITA");
  const despesas = cats.filter((c) => c.tipo === "DESPESA");

  const processos = [];
  for (const nome of NOMES) {
    const pj = /Ltda|ME$|S\.A\./.test(nome);
    const cliente = await db.cliente.create({
      data: {
        nome,
        tipo: pj ? "PJ" : "PF",
        email: `${nome.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}@email.com`,
        celular: `(11) 9${r(9000) + 1000}-${r(9000) + 1000}`,
        cidade: pick(["São Paulo", "Campinas", "Santo André", "Guarulhos", "Osasco"]),
        uf: "SP",
        origem: pick(["Indicação", "Google", "Instagram", "Site", "Parceiro"]),
        escritorioId: e,
        criadoEm: dias(-r(170)),
      },
    });
    for (let i = 0; i < 1 + r(2); i++) {
      const [titulo, area, tribunal] = pick(CASOS);
      const honorarios = (r(16) + 2) * 500;
      const p = await db.processo.create({
        data: {
          titulo,
          area,
          tribunal,
          numero: `${String(r(9999999)).padStart(7, "0")}${String(r(99)).padStart(2, "0")}2026${tribunal.startsWith("TRT") ? "5" : tribunal.startsWith("TRF") ? "4" : "8"}26${String(r(9999)).padStart(4, "0")}`,
          valorCausa: honorarios * (r(8) + 3),
          honorarios,
          honorariosExito: pick([null, 20, 30]),
          status: Math.random() < 0.85 ? "ATIVO" : pick(["SUSPENSO", "ENCERRADO"]),
          clienteId: cliente.id,
          responsavelId: pick(equipe).id,
          etapaId: pick(etapas).id,
          escritorioId: e,
          criadoEm: dias(-r(160)),
          andamentos: { create: [{ descricao: "Processo cadastrado.", data: dias(-r(150)) }, { descricao: "Petição protocolada.", data: dias(-r(60)) }] },
        },
      });
      processos.push(p);
    }
  }

  // 6 meses de financeiro: honorários recebidos e despesas fixas.
  for (let m = 5; m >= 0; m--) {
    const base = new Date();
    base.setMonth(base.getMonth() - m, 5);
    for (let k = 0; k < 4 + r(5); k++) {
      const p = pick(processos);
      const venc = new Date(base);
      venc.setDate(1 + r(27));
      const pago = m > 0 || venc < new Date() ? Math.random() < 0.85 : false;
      await db.lancamento.create({
        data: {
          tipo: "RECEITA",
          descricao: `Honorários – ${p.titulo}`,
          valor: (r(10) + 3) * 250,
          vencimento: venc,
          pagamento: pago ? venc : null,
          contaId: contas[0].id,
          categoriaId: pick(receitas).id,
          clienteId: p.clienteId,
          processoId: p.id,
          escritorioId: e,
        },
      });
    }
    for (const [desc, valor] of [["Aluguel do escritório", 3200], ["Salários", 6800], ["Software jurídico", 390], ["Custas processuais", 450 + r(600)]] as const) {
      const venc = new Date(base);
      venc.setDate(10);
      await db.lancamento.create({
        data: {
          tipo: "DESPESA",
          descricao: desc,
          valor,
          vencimento: venc,
          pagamento: m > 0 ? venc : null,
          contaId: contas[0].id,
          categoriaId: (despesas.find((c) => desc.startsWith(c.nome.split(" ")[0])) ?? pick(despesas)).id,
          escritorioId: e,
        },
      });
    }
  }

  for (let i = 0; i < 22; i++) {
    const p = pick(processos);
    const concluida = Math.random() < 0.4;
    await db.tarefa.create({
      data: {
        titulo: pick(TAREFAS),
        tipo: pick(["TAREFA", "PRAZO", "PETICAO", "AUDIENCIA", "REUNIAO"]),
        prioridade: pick(["BAIXA", "NORMAL", "NORMAL", "ALTA", "URGENTE"]),
        importante: Math.random() < 0.2,
        pontos: pick([1, 2, 3, 5]),
        prazo: dias(r(20) - 5),
        concluida,
        concluidaEm: concluida ? dias(-r(15)) : null,
        processoId: p.id,
        responsavelId: pick(equipe).id,
        criadorId: admin.id,
        escritorioId: e,
      },
    });
  }

  const tipos = ["AUDIENCIA", "REUNIAO", "PRAZO", "COMPROMISSO"];
  for (let i = 0; i < 14; i++) {
    const p = pick(processos);
    const inicio = dias(r(30) - 4);
    inicio.setHours(9 + r(8), pick([0, 30]), 0, 0);
    const tipo = pick(tipos);
    await db.evento.create({
      data: {
        titulo: `${tipo === "AUDIENCIA" ? "Audiência" : tipo === "REUNIAO" ? "Reunião" : tipo === "PRAZO" ? "Prazo" : "Compromisso"} – ${p.titulo}`,
        tipo,
        inicio,
        local: tipo === "AUDIENCIA" ? "Fórum João Mendes Jr." : tipo === "REUNIAO" ? "Google Meet" : null,
        processoId: p.id,
        usuarioId: pick(equipe).id,
        escritorioId: e,
      },
    });
  }

  console.log(`Demonstração criada: ${NOMES.length} clientes, ${processos.length} processos.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
