import { Plus, Trash2 } from "lucide-react";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Grade, type Coluna, type Linha } from "@/components/grade";
import { Aba, AreaTexto, Botao, BotaoLink, Cabecalho, Campo, Card, Entrada, Selecao } from "@/components/kit";
import { escopoCarteira, filtroCarteira } from "@/lib/acesso";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtCNJ, inputDataHora, proximaHoraCheia } from "@/lib/format";
import { MODALIDADE_AUDIENCIA, STATUS_AUDIENCIA, TIPO_AUDIENCIA, opcoes, status } from "@/lib/rotulos";
import { excluirAudiencia, salvarAudiencia } from "./actions";

export const metadata = { title: "Audiências" };

const COLUNAS: Coluna[] = [
  { chave: "data", rotulo: "Data e hora", tipo: "dataHora", link: true },
  { chave: "tipo", rotulo: "Tipo" },
  { chave: "numero", rotulo: "Processo", tipo: "mono" },
  { chave: "cliente", rotulo: "Cliente" },
  { chave: "parteContraria", rotulo: "Parte contrária", oculta: true },
  { chave: "vara", rotulo: "Vara / comarca" },
  { chave: "modalidade", rotulo: "Modalidade" },
  { chave: "local", rotulo: "Local / link", quebra: true },
  { chave: "testemunhas", rotulo: "Testemunhas", oculta: true },
  { chave: "responsavel", rotulo: "Responsável" },
  { chave: "status", rotulo: "Status", tipo: "status" },
  { chave: "resultado", rotulo: "Resultado", quebra: true, oculta: true },
];

export default async function Audiencias({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; novo?: string; editar?: string; processo?: string; voltar?: string }>;
}) {
  const sp = await searchParams;
  const aba = sp.aba === "passadas" || sp.aba === "todas" ? sp.aba : "proximas";
  const u = await exigirUsuario();
  const carteira = await escopoCarteira(u);
  const doProcesso = await filtroCarteira(u);
  const agora = new Date();
  const inicioHoje = new Date(agora);
  inicioHoje.setHours(0, 0, 0, 0);

  const [audiencias, processos, usuarios, editando] = await Promise.all([
    db.audiencia.findMany({
      where: { escritorioId: u.escritorioId, processo: doProcesso },
      include: { processo: { include: { cliente: { select: { nome: true } } } }, responsavel: { select: { nome: true } } },
      orderBy: { data: "asc" },
    }),
    sp.novo || sp.editar
      ? db.processo.findMany({ where: { escritorioId: u.escritorioId, ...doProcesso, status: { in: ["ATIVO", "SUSPENSO"] } }, include: { cliente: { select: { nome: true } } }, orderBy: { titulo: "asc" } })
      : [],
    db.usuario.findMany({ where: { escritorioId: u.escritorioId, ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    sp.editar ? db.audiencia.findFirst({ where: { id: sp.editar, escritorioId: u.escritorioId, processo: doProcesso } }) : null,
  ]);

  const proximas = audiencias.filter((a) => a.data >= inicioHoje && a.status !== "CANCELADA");
  const passadas = audiencias.filter((a) => a.data < inicioHoje).reverse();
  const lista = aba === "proximas" ? proximas : aba === "passadas" ? passadas : audiencias;

  const linhas: Linha[] = lista.map((a) => ({
    id: a.id,
    href: `/audiencias?aba=${aba}&editar=${a.id}`,
    data: a.data.toISOString(),
    tipo: TIPO_AUDIENCIA[a.tipo] ?? a.tipo,
    numero: fmtCNJ(a.processo.numero) || a.processo.titulo,
    cliente: a.processo.cliente.nome,
    parteContraria: a.processo.parteContraria,
    vara: [a.processo.vara, a.processo.comarca].filter(Boolean).join(" · "),
    modalidade: MODALIDADE_AUDIENCIA[a.modalidade] ?? a.modalidade,
    local: a.local,
    testemunhas: a.testemunhas,
    responsavel: a.responsavel?.nome,
    status: status(STATUS_AUDIENCIA, a.status),
    resultado: a.resultado,
  }));

  const formAberto = !!(sp.novo || editando);
  const a = editando;
  const voltar = sp.voltar?.startsWith("/") ? sp.voltar : `/audiencias?aba=${aba}`;

  return (
    <>
      <Cabecalho
        titulo="Controle de audiências"
        codigo="AUD"
        subtitulo={carteira === "minha" ? "Minha carteira" : "Carteira do escritório"}
        acoes={
          <BotaoLink href={`/audiencias?aba=${aba}&novo=1`}>
            <Plus size={16} /> Nova audiência
          </BotaoLink>
        }
        abas={
          <>
            <Aba href="/audiencias" ativa={aba === "proximas"} contagem={proximas.length}>Próximas</Aba>
            <Aba href="/audiencias?aba=passadas" ativa={aba === "passadas"} contagem={passadas.length}>Realizadas / passadas</Aba>
            <Aba href="/audiencias?aba=todas" ativa={aba === "todas"} contagem={audiencias.length}>Todas</Aba>
          </>
        }
      />

      {formAberto && (
        <Card titulo={a ? "Editar audiência" : "Nova audiência"} className="mb-4">
          <form action={salvarAudiencia} className="grid gap-3 md:grid-cols-4">
            {a && <input type="hidden" name="id" value={a.id} />}
            <input type="hidden" name="voltar" value={voltar} />
            <Campo rotulo="Processo *" className="md:col-span-2">
              <Selecao
                name="processoId"
                required
                defaultValue={a?.processoId ?? sp.processo ?? ""}
                vazio="Selecione..."
                opcoes={processos.map((p) => [p.id, `${fmtCNJ(p.numero) || "s/ nº"} · ${p.titulo} (${p.cliente.nome})`])}
              />
            </Campo>
            <Campo rotulo="Tipo *">
              <Selecao name="tipo" defaultValue={a?.tipo ?? "CONCILIACAO"} opcoes={opcoes(TIPO_AUDIENCIA)} />
            </Campo>
            <Campo rotulo="Data e hora *">
              <Entrada type="datetime-local" name="data" required defaultValue={inputDataHora(a?.data ?? proximaHoraCheia())} />
            </Campo>
            <Campo rotulo="Modalidade">
              <Selecao name="modalidade" defaultValue={a?.modalidade ?? "PRESENCIAL"} opcoes={opcoes(MODALIDADE_AUDIENCIA)} />
            </Campo>
            <Campo rotulo="Local, sala ou link" className="md:col-span-2">
              <Entrada name="local" defaultValue={a?.local ?? ""} placeholder="Fórum, sala ou link da videoconferência" />
            </Campo>
            <Campo rotulo="Responsável">
              <Selecao name="responsavelId" defaultValue={a?.responsavelId ?? u.id} vazio="—" opcoes={usuarios.map((x) => [x.id, x.nome])} />
            </Campo>
            <Campo rotulo="Status">
              <Selecao name="status" defaultValue={a?.status ?? "DESIGNADA"} opcoes={opcoes(STATUS_AUDIENCIA)} />
            </Campo>
            <Campo rotulo="Testemunhas / preposto" className="md:col-span-3">
              <Entrada name="testemunhas" defaultValue={a?.testemunhas ?? ""} />
            </Campo>
            <Campo rotulo="Resultado" className="md:col-span-2">
              <AreaTexto name="resultado" rows={2} defaultValue={a?.resultado ?? ""} placeholder="Acordo, redesignada, encerrada a instrução..." />
            </Campo>
            <Campo rotulo="Observações" className="md:col-span-2">
              <AreaTexto name="observacoes" rows={2} defaultValue={a?.observacoes ?? ""} />
            </Campo>
            <div className="flex items-center justify-end gap-2 md:col-span-4">
              <BotaoLink variante="secundario" href={voltar}>
                Cancelar
              </BotaoLink>
              <Botao>Salvar</Botao>
            </div>
          </form>
          {a && (
            <form action={excluirAudiencia} className="mt-2 flex justify-start border-t pt-2">
              <input type="hidden" name="id" value={a.id} />
              <BotaoConfirmar mensagem="Excluir esta audiência?" variante="fantasma" className="text-destructive">
                <Trash2 size={14} /> Excluir audiência
              </BotaoConfirmar>
            </form>
          )}
        </Card>
      )}

      <Grade id="audiencias" titulo="Audiências" colunas={COLUNAS} linhas={linhas} vazio="Nenhuma audiência cadastrada." />
    </>
  );
}
