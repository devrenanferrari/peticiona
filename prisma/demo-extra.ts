// Leads e horas de demonstração. Rode: npx tsx prisma/demo-extra.ts
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const dias = (n: number) => new Date(Date.now() + n * 86400000);
(async () => {
  const e = await db.escritorio.findFirstOrThrow({ orderBy: { criadoEm: "asc" } });
  if (await db.lead.count({ where: { escritorioId: e.id } })) return console.log("Já existem leads.");
  const leads = [
    ["Marcelo Antunes", "marcelo@logbras.com.br", "(11) 98123-4455", "LogBras Transportes", "Contratos empresariais", "Precisamos revisar os contratos com nossos principais embarcadores.", "NOVO", 0],
    ["Sílvia Prado", "silvia@vitalclin.com.br", "(11) 99654-1122", "VitalClin Saúde", "Compliance e LGPD", "Adequação à LGPD da rede de clínicas.", "NOVO", -1],
    ["Henrique Lobo", "henrique@agrovale.com", "(19) 99777-8899", "AgroVale", "Tributário", "Recuperação de créditos de PIS/COFINS.", "EM_CONTATO", -3],
    ["Daniela Freitas", "daniela@pixelhub.io", "(11) 97444-3322", "PixelHub", "Startups e inovação", "Rodada seed — acordo de investimento e vesting.", "PROPOSTA", -6],
    ["Otávio Cardoso", "otavio@metalforte.ind.br", "(11) 98888-7766", "MetalForte Indústria", "Trabalhista empresarial", "Passivo trabalhista em duas unidades.", "EM_CONTATO", -9],
  ] as const;
  for (const [nome, email, telefone, empresa, area, mensagem, status, d] of leads)
    await db.lead.create({ data: { nome, email, telefone, empresa, area, mensagem, status, consentimento: true, escritorioId: e.id, criadoEm: dias(d) } });

  const usuarios = await db.usuario.findMany({ where: { escritorioId: e.id } });
  const processos = await db.processo.findMany({ where: { escritorioId: e.id }, take: 8 });
  const atividades = ["Reunião com diretoria do cliente", "Revisão de contrato de fornecimento", "Elaboração de parecer", "Análise de documentos societários", "Preparação para audiência", "Negociação com a parte contrária"];
  for (let i = 0; i < 24; i++) {
    const p = processos[i % processos.length];
    await db.registroHoras.create({
      data: {
        data: dias(-Math.floor(Math.random() * 20)),
        minutos: [30, 45, 60, 90, 120, 150, 180][Math.floor(Math.random() * 7)],
        descricao: atividades[i % atividades.length],
        faturavel: Math.random() < 0.8,
        valorHora: [350, 450, 600][i % 3],
        clienteId: p.clienteId,
        processoId: p.id,
        usuarioId: usuarios[i % usuarios.length].id,
        escritorioId: e.id,
      },
    });
  }
  console.log("Leads e horas de demonstração criados.");
  await db.$disconnect();
})();
