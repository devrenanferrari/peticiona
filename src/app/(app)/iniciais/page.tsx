import Link from "next/link";
import { Plus, Stamp, Trash2 } from "lucide-react";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Grade, type Coluna, type Linha } from "@/components/grade";
import { Aba, AreaTexto, Botao, BotaoLink, Cabecalho, Campo, Card, Entrada, Selecao } from "@/components/kit";
import { escopoCarteira } from "@/lib/acesso";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { inputData } from "@/lib/format";
import { STATUS_INICIAL, opcoes, status } from "@/lib/rotulos";
import { AREAS } from "../processos/form-processo";
import { excluirInicial, protocolarInicial, salvarInicial } from "./actions";

export const metadata = { title: "Controle de iniciais" };

const COLUNAS: Coluna[] = [
  { chave: "titulo", rotulo: "Ação", link: true },
  { chave: "cliente", rotulo: "Cliente" },
  { chave: "parteContraria", rotulo: "Parte contrária" },
  { chave: "area", rotulo: "Área" },
  { chave: "responsavel", rotulo: "Responsável" },
  { chave: "prazo", rotulo: "Protocolar até", tipo: "prazo" },
  { chave: "pendencias", rotulo: "Pendências", quebra: true },
  { chave: "status", rotulo: "Status", tipo: "status" },
  { chave: "criadoEm", rotulo: "Aberta em", tipo: "data", oculta: true },
  { chave: "protocoladaEm", rotulo: "Protocolada em", tipo: "data" },
];

const ABERTAS = ["A_ELABORAR", "AGUARDANDO_DOCUMENTOS", "EM_ELABORACAO", "REVISAO"];

export default async function Iniciais({ searchParams }: { searchParams: Promise<{ aba?: string; novo?: string; editar?: string; cliente?: string }> }) {
  const sp = await searchParams;
  const aba = sp.aba === "protocoladas" || sp.aba === "todas" ? sp.aba : "andamento";
  const u = await exigirUsuario();
  const carteira = await escopoCarteira(u);
  const doUsuario = carteira === "minha" ? { responsavelId: u.id } : {};

  const [iniciais, clientes, usuarios, editando] = await Promise.all([
    db.inicial.findMany({
      where: { escritorioId: u.escritorioId, ...doUsuario },
      include: { cliente: { select: { nome: true } }, responsavel: { select: { nome: true } } },
      orderBy: [{ prazo: "asc" }, { criadoEm: "asc" }],
    }),
    sp.novo || sp.editar ? db.cliente.findMany({ where: { escritorioId: u.escritorioId, categoria: "CLIENTE" }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }) : [],
    db.usuario.findMany({ where: { escritorioId: u.escritorioId, ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    sp.editar ? db.inicial.findFirst({ where: { id: sp.editar, escritorioId: u.escritorioId, ...doUsuario } }) : null,
  ]);

  const andamento = iniciais.filter((i) => ABERTAS.includes(i.status));
  const protocoladas = iniciais.filter((i) => i.status === "PROTOCOLADA");
  const lista = aba === "andamento" ? andamento : aba === "protocoladas" ? protocoladas : iniciais;

  const linhas: Linha[] = lista.map((i) => ({
    id: i.id,
    href: `/iniciais?aba=${aba}&editar=${i.id}`,
    titulo: i.titulo,
    cliente: i.cliente.nome,
    parteContraria: i.parteContraria,
    area: i.area,
    responsavel: i.responsavel?.nome,
    prazo: ABERTAS.includes(i.status) ? i.prazo?.toISOString() : null,
    pendencias: i.pendencias,
    status: status(STATUS_INICIAL, i.status),
    criadoEm: i.criadoEm.toISOString(),
    protocoladaEm: i.protocoladaEm?.toISOString(),
  }));

  const i = editando;
  const voltar = `/iniciais?aba=${aba}`;

  return (
    <>
      <Cabecalho
        titulo="Controle de iniciais"
        codigo="INI"
        subtitulo="Ações a propor, do levantamento de documentos até o protocolo. Ao protocolar, a inicial vira processo."
        acoes={
          <BotaoLink href={`${voltar}&novo=1`}>
            <Plus size={16} /> Nova inicial
          </BotaoLink>
        }
        abas={
          <>
            <Aba href="/iniciais" ativa={aba === "andamento"} contagem={andamento.length}>Em andamento</Aba>
            <Aba href="/iniciais?aba=protocoladas" ativa={aba === "protocoladas"} contagem={protocoladas.length}>Protocoladas</Aba>
            <Aba href="/iniciais?aba=todas" ativa={aba === "todas"} contagem={iniciais.length}>Todas</Aba>
          </>
        }
      />

      {(sp.novo || i) && (
        <div className="mb-4 grid gap-4 xl:grid-cols-3">
          <Card titulo={i ? "Editar inicial" : "Nova inicial"} className="xl:col-span-2">
            <form action={salvarInicial} className="grid gap-3 md:grid-cols-4">
              {i && <input type="hidden" name="id" value={i.id} />}
              <Campo rotulo="Cliente *" className="md:col-span-2">
                <Selecao name="clienteId" required defaultValue={i?.clienteId ?? sp.cliente ?? ""} vazio="Selecione..." opcoes={clientes.map((c) => [c.id, c.nome])} />
              </Campo>
              <Campo rotulo="Ação *" className="md:col-span-2">
                <Entrada name="titulo" required defaultValue={i?.titulo ?? ""} placeholder="Ex.: Ação revisional de contrato bancário" />
              </Campo>
              <Campo rotulo="Parte contrária" className="md:col-span-2">
                <Entrada name="parteContraria" defaultValue={i?.parteContraria ?? ""} />
              </Campo>
              <Campo rotulo="Área">
                <Selecao name="area" defaultValue={i?.area ?? ""} vazio="—" opcoes={AREAS} />
              </Campo>
              <Campo rotulo="Protocolar até">
                <Entrada type="date" name="prazo" defaultValue={inputData(i?.prazo)} />
              </Campo>
              <Campo rotulo="Responsável">
                <Selecao name="responsavelId" disabled={u.carteiraRestrita} defaultValue={i?.responsavelId ?? u.id} vazio="—" opcoes={usuarios.map((x) => [x.id, x.nome])} />
              </Campo>
              <Campo rotulo="Status">
                <Selecao name="status" defaultValue={i?.status ?? "A_ELABORAR"} opcoes={opcoes(STATUS_INICIAL).filter(([v]) => v !== "PROTOCOLADA" || i?.status === "PROTOCOLADA")} />
              </Campo>
              <Campo rotulo="Pendências (documentos, informações)" className="md:col-span-2">
                <AreaTexto name="pendencias" rows={2} defaultValue={i?.pendencias ?? ""} placeholder="Procuração, comprovante de residência, contrato..." />
              </Campo>
              <Campo rotulo="Observações" className="md:col-span-4">
                <AreaTexto name="observacoes" rows={2} defaultValue={i?.observacoes ?? ""} />
              </Campo>
              <div className="flex justify-end gap-2 md:col-span-4">
                <BotaoLink variante="secundario" href={voltar}>
                  Cancelar
                </BotaoLink>
                <Botao>Salvar</Botao>
              </div>
            </form>
            {i && (
              <form action={excluirInicial} className="mt-2 border-t pt-2">
                <input type="hidden" name="id" value={i.id} />
                <BotaoConfirmar mensagem="Excluir esta inicial?" variante="fantasma" className="text-destructive">
                  <Trash2 size={14} /> Excluir
                </BotaoConfirmar>
              </form>
            )}
          </Card>

          {i && (
            <Card titulo={<><Stamp size={16} /> Protocolo</>}>
              {i.processoId ? (
                <p className="text-sm">
                  Protocolada. <Link href={`/processos/${i.processoId}`} className="font-medium text-marca hover:underline">Abrir processo</Link>
                </p>
              ) : (
                <form action={protocolarInicial} className="space-y-3">
                  <input type="hidden" name="id" value={i.id} />
                  <p className="text-[0.8125rem] text-muted-foreground">Cria o processo na 1ª instância com os dados desta inicial e abre a ficha para completar vara e comarca.</p>
                  <Campo rotulo="Nº do processo (CNJ)">
                    <Entrada name="numero" placeholder="0000000-00.0000.0.00.0000" />
                  </Campo>
                  <Campo rotulo="Protocolada em">
                    <Entrada type="date" name="protocoladaEm" defaultValue={inputData(new Date())} />
                  </Campo>
                  <Botao variante="sucesso" className="w-full">
                    <Stamp size={15} /> Marcar como protocolada
                  </Botao>
                </form>
              )}
            </Card>
          )}
        </div>
      )}

      <Grade id="iniciais" titulo="Iniciais" colunas={COLUNAS} linhas={linhas} vazio="Nenhuma inicial em andamento." />
    </>
  );
}
