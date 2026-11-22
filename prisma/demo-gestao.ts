// 2ª instância, prazos, audiências, iniciais, RPVs e empréstimos de demonstração. Rode: npx tsx prisma/demo-gestao.ts
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const dias = (n: number, hora = 12) => {
  const d = new Date(Date.now() + n * 86400000);
  d.setHours(hora, 0, 0, 0);
  return d;
};

(async () => {
  const e = await db.escritorio.findFirstOrThrow({ orderBy: { criadoEm: "asc" } });
  if (await db.audiencia.count({ where: { escritorioId: e.id } })) return console.log("Já existem dados de gestão.");
  const usuarios = await db.usuario.findMany({ where: { escritorioId: e.id }, orderBy: { criadoEm: "asc" } });
  const processos = await db.processo.findMany({ where: { escritorioId: e.id, status: "ATIVO" }, orderBy: { criadoEm: "asc" } });
  const clientes = await db.cliente.findMany({ where: { escritorioId: e.id, categoria: "CLIENTE" }, take: 6 });
  const contas = await db.contaBancaria.findMany({ where: { escritorioId: e.id } });
  const catDespesa = await db.categoriaFinanceira.findFirst({ where: { escritorioId: e.id, tipo: "DESPESA", nome: { contains: "Outras" } } });

  // A estagiária de exemplo passa a ver só a própria carteira .
  const estagiaria = usuarios.find((x) => x.papel === "ESTAGIARIO");
  if (estagiaria) await db.usuario.update({ where: { id: estagiaria.id }, data: { carteiraRestrita: true } });

  // 2ª instância
  const recursos = [
    ["Apelação", "TJMG", "5ª Câmara Cível", "Des. Carlos Henrique Perpétuo", "Revisão de cláusulas e juros remuneratórios", "Pautado", 9],
    ["Recurso ordinário", "TRT3", "3ª Turma", "Des. Milton Thibau", "Horas extras e adicional de insalubridade", "Concluso ao relator", null],
    ["Agravo de instrumento", "TJMG", "12ª Câmara Cível", "Des. José Flávio de Almeida", "Tutela de urgência indeferida", "Aguardando contrarrazões", null],
    ["Apelação", "TJMG", "2ª Câmara Cível", "Des. Raimundo Messias Júnior", "Indenização por danos morais (quantum)", "Julgado – aguardando acórdão", -4],
    ["Recurso especial", "STJ", "4ª Turma", "Min. Antonio Carlos Ferreira", "Prescrição intercorrente", "Concluso ao relator", null],
    ["Agravo de petição", "TRT3", "7ª Turma", "Des. Cristiana Fenelon", "Cálculos de liquidação", "Pautado", 16],
  ] as const;
  const recursais = processos.slice(0, recursos.length);
  for (const [i, p] of recursais.entries()) {
    const [recurso, tribunal, orgao, relator, materia, situacao, sessao] = recursos[i];
    await db.processo.update({
      where: { id: p.id },
      data: {
        instancia: tribunal === "STJ" ? "Tribunais superiores" : "2ª instância",
        recurso,
        tribunal,
        orgaoJulgador: orgao,
        relator,
        materia,
        situacao,
        sessaoEm: sessao != null ? dias(sessao) : null,
        honorariosExito: p.honorariosExito ?? [20, 25, 30][i % 3],
        andamentos: { create: { data: dias(-20 + i), descricao: `${recurso} distribuído(a) à ${orgao} (${tribunal}).` } },
      },
    });
  }
  const primeira = processos.slice(recursos.length);
  await db.processo.updateMany({ where: { id: { in: primeira.map((p) => p.id) } }, data: { instancia: "1ª instância" } });
  if (estagiaria) await db.processo.updateMany({ where: { id: { in: primeira.slice(0, 4).map((p) => p.id) } }, data: { responsavelId: estagiaria.id } });

  // Prazos processuais
  const prazos = ["Contestação", "Réplica", "Manifestação sobre laudo pericial", "Contrarrazões de apelação", "Memoriais", "Embargos de declaração", "Especificação de provas", "Impugnação ao cumprimento de sentença"];
  for (const [i, p] of processos.slice(0, 14).entries()) {
    const atual = await db.processo.findUniqueOrThrow({ where: { id: p.id } });
    await db.tarefa.create({
      data: {
        titulo: prazos[i % prazos.length],
        tipo: "PRAZO",
        prioridade: "ALTA",
        prazo: dias([-2, 0, 1, 3, 5, 8, 12, 15, 20, -1, 2, 6, 10, 25][i]),
        pontos: 3,
        processoId: p.id,
        responsavelId: atual.responsavelId ?? usuarios[0].id,
        criadorId: usuarios[0].id,
        escritorioId: e.id,
      },
    });
  }

  // Audiências
  const auds = [
    ["CONCILIACAO", 1, 14, "VIRTUAL", "https://meet.google.com/abc-defg-hij"],
    ["INSTRUCAO_JULGAMENTO", 3, 9, "PRESENCIAL", "Fórum Lafayette, sala 412"],
    ["UNA", 6, 13, "PRESENCIAL", "TRT3 – 15ª Vara do Trabalho de BH"],
    ["INSTRUCAO", 10, 15, "HIBRIDA", "Fórum de Contagem / Zoom"],
    ["CONCILIACAO", 18, 10, "VIRTUAL", "CEJUSC – link enviado por e-mail"],
    ["CONCILIACAO", -12, 14, "VIRTUAL", "CEJUSC"],
    ["INSTRUCAO_JULGAMENTO", -30, 9, "PRESENCIAL", "Fórum Lafayette"],
  ] as const;
  for (const [i, [tipo, d, hora, modalidade, local]] of auds.entries()) {
    const p = primeira[i % primeira.length];
    const passada = d < 0;
    await db.audiencia.create({
      data: {
        tipo,
        data: dias(d, hora),
        modalidade,
        local,
        status: passada ? "REALIZADA" : "DESIGNADA",
        resultado: passada ? (i % 2 ? "Encerrada a instrução; prazo para memoriais." : "Sem acordo. Designada instrução.") : null,
        testemunhas: tipo.startsWith("INSTRUCAO") ? "2 testemunhas do cliente; preposto confirmado" : null,
        processoId: p.id,
        responsavelId: p.responsavelId,
        escritorioId: e.id,
      },
    });
  }

  // Controle de iniciais
  const iniciais = [
    ["Ação revisional de contrato bancário", "Bancário", "Banco Horizonte S.A.", "AGUARDANDO_DOCUMENTOS", 5, "Extratos dos últimos 5 anos; contrato assinado"],
    ["Ação de cobrança", "Empresarial", "Construtora Vértice Ltda.", "EM_ELABORACAO", 3, null],
    ["Reclamação trabalhista", "Trabalhista", "Transportadora Rápida Ltda.", "REVISAO", 1, null],
    ["Mandado de segurança – ICMS", "Tributário", "Estado de Minas Gerais", "A_ELABORAR", 12, "Procuração; guias de recolhimento"],
    ["Ação anulatória de auto de infração", "Tributário", "Município de Belo Horizonte", "AGUARDANDO_DOCUMENTOS", -2, "Cópia integral do PA"],
    ["Ação de obrigação de fazer – plano de saúde", "Saúde", "Operadora Vida+ Saúde", "EM_ELABORACAO", 2, "Relatório médico atualizado"],
  ] as const;
  for (const [i, [titulo, area, parte, status, prazo, pendencias]] of iniciais.entries()) {
    await db.inicial.create({
      data: {
        titulo,
        area,
        parteContraria: parte,
        status,
        prazo: dias(prazo),
        pendencias,
        clienteId: clientes[i % clientes.length].id,
        responsavelId: i === 1 && estagiaria ? estagiaria.id : usuarios[i % 2].id,
        escritorioId: e.id,
      },
    });
  }

  // RPV e precatórios
  const reqs = [
    ["RPV", 38500, "EXPEDIDA", -25, 35],
    ["RPV", 21900, "EXPEDIDA", -50, 10],
    ["PRECATORIO", 412000, "EXPEDIDA", -200, 240],
    ["RPV", 15400, "A_EXPEDIR", null, null],
  ] as const;
  for (const [i, [tipo, valor, status, exp, prev]] of reqs.entries()) {
    const p = recursais[i % recursais.length];
    await db.requisicao.create({
      data: {
        tipo,
        numero: status === "A_EXPEDIR" ? null : `${2026}${String(10234 + i * 37).padStart(7, "0")}`,
        valor,
        percentual: (await db.processo.findUniqueOrThrow({ where: { id: p.id } })).honorariosExito,
        status,
        expedidaEm: exp != null ? dias(exp) : null,
        previsao: prev != null ? dias(prev) : null,
        processoId: p.id,
        escritorioId: e.id,
      },
    });
  }

  // Empréstimos: um em andamento (5 parcelas pagas) e um novo.
  const emprestimos = [
    ["Capital de giro – Banco Inter", "Banco Inter", 60000, 1.49, 24, -150, 5],
    ["Financiamento de equipamentos", "Sicoob", 18000, 1.19, 12, 20, 0],
  ] as const;
  for (const [descricao, credor, valor, taxa, n, inicio, pagas] of emprestimos) {
    const i = taxa / 100;
    const parcela = Math.round(((valor * i) / (1 - Math.pow(1 + i, -n))) * 100) / 100;
    const primeiro = dias(inicio);
    await db.emprestimo.create({
      data: {
        descricao,
        credor,
        valor,
        taxaMensal: taxa,
        parcelas: n,
        valorParcela: parcela,
        primeiroVencimento: primeiro,
        contaId: contas[0].id,
        categoriaId: catDespesa?.id,
        escritorioId: e.id,
        lancamentos: {
          create: Array.from({ length: n }, (_, k) => {
            const venc = new Date(primeiro);
            venc.setMonth(venc.getMonth() + k);
            return {
              tipo: "DESPESA",
              descricao: `${descricao} – parcela ${k + 1}/${n}`,
              valor: parcela,
              vencimento: venc,
              pagamento: k < pagas ? venc : null,
              parcela: k + 1,
              contaId: contas[0].id,
              categoriaId: catDespesa?.id,
              escritorioId: e.id,
            };
          }),
        },
      },
    });
  }

  console.log("Dados de gestão (2ª instância, prazos, audiências, iniciais, RPVs, empréstimos) criados.");
  await db.$disconnect();
})();
