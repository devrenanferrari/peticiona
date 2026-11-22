import { Plus } from "lucide-react";
import { Aba, BotaoLink, Cabecalho } from "@/components/kit";
import { Grade, type Coluna, type Linha } from "@/components/grade";
import { escopoCarteira, filtroCarteira } from "@/lib/acesso";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtCNJ } from "@/lib/format";
import { INSTANCIAS_RECURSAIS, STATUS_PROCESSO, STATUS_REQUISICAO, TIPO_AUDIENCIA, TIPO_REQUISICAO, status } from "@/lib/rotulos";

export const metadata = { title: "Processos" };

const ABAS = {
  "1": { titulo: "Processos · 1ª instância", codigo: "PR1" },
  "2": { titulo: "2ª instância e tribunais", codigo: "PR2" },
  todos: { titulo: "Todos os processos", codigo: "PR" },
} as const;

const COMUNS_INICIO: Coluna[] = [
  { chave: "numero", rotulo: "Nº do processo", tipo: "mono", link: true },
  { chave: "titulo", rotulo: "Ação / objeto", link: true },
  { chave: "cliente", rotulo: "Cliente" },
];
const COMUNS_FIM: Coluna[] = [
  { chave: "prazo", rotulo: "Próximo prazo", tipo: "prazo" },
  { chave: "prazoDescricao", rotulo: "Prazo para" },
  { chave: "responsavel", rotulo: "Responsável" },
  { chave: "status", rotulo: "Status", tipo: "status" },
];

const COLUNAS: Record<keyof typeof ABAS, Coluna[]> = {
  "1": [
    ...COMUNS_INICIO,
    { chave: "parteContraria", rotulo: "Parte contrária" },
    { chave: "vara", rotulo: "Vara" },
    { chave: "comarca", rotulo: "Comarca" },
    { chave: "area", rotulo: "Área", oculta: true },
    { chave: "audiencia", rotulo: "Próxima audiência", tipo: "dataHora" },
    { chave: "audienciaTipo", rotulo: "Tipo de audiência", oculta: true },
    ...COMUNS_FIM,
    { chave: "etapa", rotulo: "Etapa", oculta: true },
    { chave: "valorCausa", rotulo: "Valor da causa", tipo: "moeda", total: true, oculta: true },
    { chave: "exito", rotulo: "% contrato", tipo: "percentual", oculta: true },
  ],
  "2": [
    ...COMUNS_INICIO,
    { chave: "recurso", rotulo: "Recurso" },
    { chave: "tribunal", rotulo: "Tribunal" },
    { chave: "orgaoJulgador", rotulo: "Turma / Câmara" },
    { chave: "relator", rotulo: "Relator", oculta: true },
    { chave: "vara", rotulo: "Vara de origem" },
    { chave: "materia", rotulo: "Matéria / a ser julgado", quebra: true },
    { chave: "situacao", rotulo: "Situação" },
    { chave: "sessao", rotulo: "Sessão de julgamento", tipo: "data" },
    ...COMUNS_FIM,
    { chave: "exito", rotulo: "% contrato", tipo: "percentual" },
    { chave: "rpv", rotulo: "RPV / precatório", tipo: "status" },
    { chave: "rpvValor", rotulo: "Valor requisitado", tipo: "moeda", total: true, oculta: true },
  ],
  todos: [
    ...COMUNS_INICIO,
    { chave: "instancia", rotulo: "Instância" },
    { chave: "area", rotulo: "Área" },
    { chave: "parteContraria", rotulo: "Parte contrária", oculta: true },
    ...COMUNS_FIM,
    { chave: "valorCausa", rotulo: "Valor da causa", tipo: "moeda", total: true, oculta: true },
  ],
};

export default async function Processos({ searchParams }: { searchParams: Promise<{ aba?: string; encerrados?: string }> }) {
  const sp = await searchParams;
  const aba = (sp.aba && sp.aba in ABAS ? sp.aba : "1") as keyof typeof ABAS;
  const u = await exigirUsuario();
  const carteira = await escopoCarteira(u);
  const agora = new Date();

  const processos = await db.processo.findMany({
    where: {
      escritorioId: u.escritorioId,
      ...(await filtroCarteira(u)),
      ...(sp.encerrados ? {} : { status: { in: ["ATIVO", "SUSPENSO"] } }),
    },
    include: {
      cliente: { select: { nome: true } },
      responsavel: { select: { nome: true } },
      etapa: { include: { fase: true } },
      tarefas: { where: { concluida: false, prazo: { not: null } }, orderBy: { prazo: "asc" }, take: 1, select: { prazo: true, titulo: true } },
      audiencias: { where: { data: { gte: agora }, status: "DESIGNADA" }, orderBy: { data: "asc" }, take: 1, select: { data: true, tipo: true } },
      requisicoes: { where: { status: { not: "CANCELADA" } }, orderBy: { criadoEm: "desc" }, take: 1 },
    },
    orderBy: { atualizadoEm: "desc" },
  });

  const recursal = (p: { instancia: string | null }) => INSTANCIAS_RECURSAIS.includes(p.instancia ?? "");
  const porAba = {
    "1": processos.filter((p) => !recursal(p)),
    "2": processos.filter(recursal),
    todos: processos,
  };

  const linhas: Linha[] = porAba[aba].map((p) => {
    const prazo = p.tarefas[0];
    const aud = p.audiencias[0];
    const req = p.requisicoes[0];
    return {
      id: p.id,
      href: `/processos/${p.id}`,
      numero: fmtCNJ(p.numero) || "Sem número",
      titulo: p.titulo,
      cliente: p.cliente.nome,
      parteContraria: p.parteContraria,
      vara: p.vara,
      comarca: p.comarca,
      area: p.area,
      instancia: p.instancia,
      tribunal: p.tribunal,
      recurso: p.recurso,
      orgaoJulgador: p.orgaoJulgador,
      relator: p.relator,
      materia: p.materia,
      situacao: p.situacao,
      sessao: p.sessaoEm?.toISOString(),
      audiencia: aud?.data.toISOString(),
      audienciaTipo: aud ? TIPO_AUDIENCIA[aud.tipo] : null,
      prazo: prazo?.prazo?.toISOString(),
      prazoDescricao: prazo?.titulo,
      responsavel: p.responsavel?.nome,
      status: status(STATUS_PROCESSO, p.status),
      etapa: p.etapa ? `${p.etapa.fase.nome} › ${p.etapa.nome}` : null,
      valorCausa: p.valorCausa,
      exito: p.honorariosExito,
      rpv: req ? { texto: `${TIPO_REQUISICAO[req.tipo]} · ${STATUS_REQUISICAO[req.status]?.[0] ?? req.status}`, tom: STATUS_REQUISICAO[req.status]?.[1] ?? "cinza" } : null,
      rpvValor: req?.valor,
    };
  });

  const link = (a: string, encerrados = !!sp.encerrados) => {
    const q = new URLSearchParams({ ...(a !== "1" ? { aba: a } : {}), ...(encerrados ? { encerrados: "1" } : {}) });
    return `/processos${q.size ? `?${q}` : ""}`;
  };

  return (
    <>
      <Cabecalho
        titulo={ABAS[aba].titulo}
        codigo={ABAS[aba].codigo}
        subtitulo={`${carteira === "minha" ? "Minha carteira" : "Carteira do escritório"} · ${sp.encerrados ? "inclui encerrados e arquivados" : "ativos e suspensos"}`}
        acoes={
          <>
            <BotaoLink variante="secundario" href={link(aba, !sp.encerrados)}>
              {sp.encerrados ? "Ocultar encerrados" : "Mostrar encerrados"}
            </BotaoLink>
            <BotaoLink href={`/processos/novo${aba === "2" ? "?instancia=2" : ""}`}>
              <Plus size={16} /> Novo processo
            </BotaoLink>
          </>
        }
        abas={
          <>
            <Aba href={link("1")} ativa={aba === "1"} contagem={porAba["1"].length}>1ª instância</Aba>
            <Aba href={link("2")} ativa={aba === "2"} contagem={porAba["2"].length}>2ª instância e tribunais</Aba>
            <Aba href={link("todos")} ativa={aba === "todos"} contagem={porAba.todos.length}>Todos</Aba>
          </>
        }
      />
      <Grade id={`processos-${aba}`} titulo="Processos" colunas={COLUNAS[aba]} linhas={linhas} vazio="Nenhum processo nesta carteira." />
    </>
  );
}
