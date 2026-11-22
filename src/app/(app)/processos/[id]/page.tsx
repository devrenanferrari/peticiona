import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, Check, FilePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Pilula, Prazo } from "@/components/grade";
import {
  Aba, Atributos, Botao, BotaoLink, Cabecalho, Campo, Card, Entrada, Selecao, StatusProcesso, Tabela, Td, Vazio, cx,
} from "@/components/kit";
import { exigirAcessoProcesso, podeFinanceiro } from "@/lib/acesso";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, fmtCNJ, fmtData, fmtDataHora, inputData } from "@/lib/format";
import {
  INSTANCIAS_RECURSAIS, MODALIDADE_AUDIENCIA, STATUS_AUDIENCIA, STATUS_REQUISICAO, TIPO_AUDIENCIA, TIPO_REQUISICAO, opcoes, parteEscritorio,
} from "@/lib/rotulos";
import { alternarConclusao, salvarTarefa } from "../../atividades/actions";
import { salvarRequisicao } from "../../financeiro/rpv/actions";
import { adicionarAndamento, excluirAndamento, excluirProcesso } from "../actions";
import { FormProcesso } from "../form-processo";

const ABAS = [
  ["geral", "Visão geral"],
  ["prazos", "Prazos e tarefas"],
  ["audiencias", "Audiências"],
  ["andamentos", "Andamentos"],
  ["financeiro", "RPV e financeiro"],
  ["documentos", "Peças e documentos"],
] as const;
type AbaId = (typeof ABAS)[number][0];

export default async function DetalheProcesso({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ editar?: string; aba?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const aba: AbaId = ABAS.some(([a]) => a === sp.aba) ? (sp.aba as AbaId) : "geral";
  const u = await exigirUsuario();
  const financeiro = podeFinanceiro(u);
  const p = await db.processo.findFirst({
    where: { id, escritorioId: u.escritorioId },
    include: {
      cliente: true,
      responsavel: true,
      etapa: { include: { fase: true } },
      andamentos: { orderBy: { data: "desc" } },
      tarefas: { orderBy: [{ concluida: "asc" }, { prazo: "asc" }], include: { responsavel: true } },
      audiencias: { orderBy: { data: "desc" }, include: { responsavel: true } },
      requisicoes: { orderBy: { criadoEm: "desc" } },
      lancamentos: { orderBy: { vencimento: "desc" } },
      documentos: { orderBy: { criadoEm: "desc" } },
      intimacoes: { orderBy: { dataPublicacao: "desc" } },
      inicial: true,
    },
  });
  if (!p) notFound();
  exigirAcessoProcesso(u, p);

  if (sp.editar) {
    return (
      <>
        <Cabecalho titulo={`Editar: ${p.titulo}`} subtitulo={fmtCNJ(p.numero) || "Sem número"} />
        <FormProcesso processo={p} />
      </>
    );
  }

  const agora = new Date();
  const usuarios = aba === "prazos" ? await db.usuario.findMany({ where: { escritorioId: u.escritorioId, ativo: true }, orderBy: { nome: "asc" } }) : [];
  const prazoAberto = p.tarefas.find((t) => !t.concluida && t.prazo);
  const proxAudiencia = [...p.audiencias].reverse().find((a) => a.data >= agora && a.status === "DESIGNADA");
  const recebido = p.lancamentos.filter((l) => l.tipo === "RECEITA" && l.pagamento).reduce((s, l) => s + l.valor, 0);
  const aReceber = p.lancamentos.filter((l) => l.tipo === "RECEITA" && !l.pagamento).reduce((s, l) => s + l.valor, 0);
  const rpvAberto = p.requisicoes.filter((r) => r.status === "A_EXPEDIR" || r.status === "EXPEDIDA").reduce((s, r) => s + parteEscritorio(r), 0);
  const recursal = INSTANCIAS_RECURSAIS.includes(p.instancia ?? "");
  const aqui = (a: AbaId) => `/processos/${p.id}${a === "geral" ? "" : `?aba=${a}`}`;
  const contagem: Partial<Record<AbaId, number>> = {
    prazos: p.tarefas.filter((t) => !t.concluida).length,
    audiencias: p.audiencias.length,
    andamentos: p.andamentos.length,
    financeiro: p.requisicoes.length,
    documentos: p.documentos.length,
  };

  return (
    <>
      <Cabecalho
        titulo={p.titulo}
        subtitulo={
          <>
            <span className="font-mono">{fmtCNJ(p.numero) || "Sem número"}</span> · {p.instancia ?? "Instância não informada"} · Cliente:{" "}
            <Link href={`/clientes/${p.clienteId}`} className="text-marca hover:underline">
              {p.cliente.nome}
            </Link>
          </>
        }
        acoes={
          <>
            <BotaoLink variante="secundario" href={`/modelos?cliente=${p.clienteId}&processo=${p.id}`}>
              <FilePlus size={15} /> Gerar peça
            </BotaoLink>
            <BotaoLink href={`/processos/${p.id}?editar=1`}>
              <Pencil size={14} /> Editar
            </BotaoLink>
          </>
        }
        abas={ABAS.map(([a, r]) => (
          <Aba key={a} href={aqui(a)} ativa={aba === a} contagem={contagem[a] || undefined}>
            {r}
          </Aba>
        ))}
      />

      {/* Indicadores do cabeçalho do objeto */}
      <div className="mb-4 grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-5">
        <Kpi rotulo="Status">
          <StatusProcesso status={p.status} />
        </Kpi>
        <Kpi rotulo="Próximo prazo">{prazoAberto?.prazo ? <><Prazo iso={prazoAberto.prazo.toISOString()} /><p className="mt-0.5 truncate text-xs text-muted-foreground">{prazoAberto.titulo}</p></> : "—"}</Kpi>
        <Kpi rotulo="Próxima audiência">
          {proxAudiencia ? (
            <>
              <p className="tabular">{fmtDataHora(proxAudiencia.data)}</p>
              <p className="text-xs text-muted-foreground">{TIPO_AUDIENCIA[proxAudiencia.tipo]}</p>
            </>
          ) : (
            "—"
          )}
        </Kpi>
        <Kpi rotulo="Responsável">{p.responsavel?.nome ?? "—"}</Kpi>
        <Kpi rotulo={financeiro ? "Recebido / a receber" : "% do contrato"}>
          {financeiro ? (
            <p className="tabular">
              <span className="text-success">{brl(recebido)}</span> <span className="text-muted-foreground">/</span> {brl(aReceber + rpvAberto)}
            </p>
          ) : p.honorariosExito != null ? (
            `${p.honorariosExito}%`
          ) : (
            "—"
          )}
        </Kpi>
      </div>

      {aba === "geral" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card titulo="Dados do processo">
              <Atributos
                className="lg:grid-cols-3"
                itens={[
                  ["Área", p.area],
                  ["Tipo de ação", p.tipoAcao],
                  ["Parte contrária", p.parteContraria],
                  ["Posição do cliente", p.posicaoCliente],
                  ["Distribuído em", p.distribuidoEm ? fmtData(p.distribuidoEm) : null],
                  ["Etapa (CRM)", p.etapa ? `${p.etapa.fase.nome} › ${p.etapa.nome}` : null],
                  ["Valor da causa", p.valorCausa != null ? brl(p.valorCausa) : null],
                  ["Honorários contratuais", p.honorarios != null ? brl(p.honorarios) : null],
                  ["% do contrato (êxito)", p.honorariosExito != null ? `${p.honorariosExito}%` : null],
                ]}
              />
            </Card>
            <Card titulo="Juízo">
              <Atributos
                className="lg:grid-cols-3"
                itens={[
                  ["Tribunal", p.tribunal],
                  [recursal ? "Vara de origem" : "Vara", p.vara],
                  ["Comarca", p.comarca],
                  ["Instância", p.instancia],
                  ...(recursal || p.orgaoJulgador || p.recurso
                    ? ([
                        ["Recurso", p.recurso],
                        ["Turma / Câmara", p.orgaoJulgador],
                        ["Relator", p.relator],
                        ["Sessão de julgamento", p.sessaoEm ? fmtData(p.sessaoEm) : null],
                        ["Situação", p.situacao],
                        ["Matéria / a ser julgado", p.materia],
                      ] as [string, string | null][])
                    : []),
                ]}
              />
            </Card>
            {p.observacoes && (
              <Card titulo="Observações">
                <p className="text-sm whitespace-pre-wrap">{p.observacoes}</p>
              </Card>
            )}
          </div>
          <div className="space-y-4">
            <Card titulo="Últimos andamentos" acoes={<Link href={aqui("andamentos")} className="text-xs text-marca hover:underline">Ver todos</Link>}>
              {p.andamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum andamento.</p>
              ) : (
                <ul className="space-y-2.5 text-[0.8125rem]">
                  {p.andamentos.slice(0, 5).map((a) => (
                    <li key={a.id}>
                      <p className="text-xs text-muted-foreground">{fmtData(a.data)}</p>
                      <p className="line-clamp-2">{a.descricao}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            {p.intimacoes.length > 0 && (
              <Card titulo="Intimações vinculadas">
                <ul className="space-y-2 text-[0.8125rem]">
                  {p.intimacoes.slice(0, 4).map((i) => (
                    <li key={i.id} className="rounded-sm bg-muted/60 p-2">
                      <p className="text-xs text-muted-foreground">
                        {fmtData(i.dataPublicacao)} · {i.diario ?? "Diário"}
                      </p>
                      <p className="line-clamp-3">{i.conteudo}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {p.inicial && (
              <Card titulo="Origem">
                <p className="text-[0.8125rem]">
                  Criado a partir do controle de iniciais, protocolado em {fmtData(p.inicial.protocoladaEm)}.
                </p>
              </Card>
            )}
            <form action={excluirProcesso} className="flex justify-end">
              <input type="hidden" name="id" value={p.id} />
              <BotaoConfirmar mensagem="Excluir este processo e todo o histórico dele?" variante="fantasma" className="text-destructive">
                <Trash2 size={14} /> Excluir processo
              </BotaoConfirmar>
            </form>
          </div>
        </div>
      )}

      {aba === "prazos" && (
        <div className="space-y-4">
          <Card titulo="Novo prazo ou tarefa">
            <form action={salvarTarefa} className="grid gap-3 md:grid-cols-6">
              <input type="hidden" name="processoId" value={p.id} />
              <input type="hidden" name="voltar" value={aqui("prazos")} />
              <Campo rotulo="Descrição *" className="md:col-span-2">
                <Entrada name="titulo" required placeholder="Ex.: Contrarrazões de apelação" />
              </Campo>
              <Campo rotulo="Tipo">
                <Selecao name="tipo" defaultValue="PRAZO" opcoes={[["PRAZO", "Prazo processual"], ["TAREFA", "Tarefa"], ["PETICAO", "Petição"], ["REUNIAO", "Reunião"]]} />
              </Campo>
              <Campo rotulo="Prazo fatal">
                <Entrada type="date" name="prazo" required />
              </Campo>
              <Campo rotulo="Responsável">
                <Selecao name="responsavelId" defaultValue={p.responsavelId ?? u.id} opcoes={usuarios.map((x) => [x.id, x.nome])} />
              </Campo>
              <div className="flex items-end">
                <Botao className="w-full">
                  <Plus size={15} /> Adicionar
                </Botao>
              </div>
              <input type="hidden" name="prioridade" value="ALTA" />
            </form>
          </Card>
          {p.tarefas.length === 0 ? (
            <Card>
              <Vazio>Nenhum prazo ou tarefa neste processo.</Vazio>
            </Card>
          ) : (
            <Tabela colunas={["", "Prazo", "Descrição", "Tipo", "Responsável", "Situação"]}>
              {p.tarefas.map((t) => (
                <tr key={t.id} className={cx(t.concluida && "text-muted-foreground")}>
                  <Td className="w-10 py-1.5">
                    <form action={alternarConclusao}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        title={t.concluida ? "Reabrir" : "Concluir"}
                        className={cx("flex size-5 items-center justify-center rounded-sm border", t.concluida ? "border-success bg-success text-white" : "border-border hover:border-success")}
                      >
                        {t.concluida && <Check size={12} />}
                      </button>
                    </form>
                  </Td>
                  <Td className="py-1.5">{t.prazo ? t.concluida ? fmtData(t.prazo) : <Prazo iso={t.prazo.toISOString()} /> : "—"}</Td>
                  <Td className={cx("py-1.5", t.concluida && "line-through")}>{t.titulo}</Td>
                  <Td className="py-1.5">{{ PRAZO: "Prazo", TAREFA: "Tarefa", PETICAO: "Petição", REUNIAO: "Reunião", AUDIENCIA: "Audiência" }[t.tipo] ?? t.tipo}</Td>
                  <Td className="py-1.5">{t.responsavel?.nome ?? "—"}</Td>
                  <Td className="py-1.5">{t.concluida ? <Pilula tom="verde">Concluído {fmtData(t.concluidaEm)}</Pilula> : <Pilula tom="azul">Em aberto</Pilula>}</Td>
                </tr>
              ))}
            </Tabela>
          )}
        </div>
      )}

      {aba === "audiencias" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <BotaoLink href={`/audiencias?novo=1&processo=${p.id}&voltar=${encodeURIComponent(aqui("audiencias"))}`}>
              <CalendarPlus size={15} /> Nova audiência
            </BotaoLink>
          </div>
          {p.audiencias.length === 0 ? (
            <Card>
              <Vazio>Nenhuma audiência registrada.</Vazio>
            </Card>
          ) : (
            <Tabela colunas={["Data e hora", "Tipo", "Modalidade", "Local / link", "Responsável", "Status", "Resultado"]}>
              {p.audiencias.map((a) => (
                <tr key={a.id}>
                  <Td>
                    <Link href={`/audiencias?aba=todas&editar=${a.id}&voltar=${encodeURIComponent(aqui("audiencias"))}`} className="tabular font-medium text-marca hover:underline">
                      {fmtDataHora(a.data)}
                    </Link>
                  </Td>
                  <Td>{TIPO_AUDIENCIA[a.tipo] ?? a.tipo}</Td>
                  <Td>{MODALIDADE_AUDIENCIA[a.modalidade] ?? a.modalidade}</Td>
                  <Td className="max-w-56 truncate">{a.local ?? "—"}</Td>
                  <Td>{a.responsavel?.nome ?? "—"}</Td>
                  <Td>
                    <Pilula tom={STATUS_AUDIENCIA[a.status]?.[1] ?? "cinza"}>{STATUS_AUDIENCIA[a.status]?.[0] ?? a.status}</Pilula>
                  </Td>
                  <Td className="max-w-64 truncate">{a.resultado ?? "—"}</Td>
                </tr>
              ))}
            </Tabela>
          )}
        </div>
      )}

      {aba === "andamentos" && (
        <Card>
          <form action={adicionarAndamento} className="mb-4 flex flex-wrap gap-2">
            <input type="hidden" name="processoId" value={p.id} />
            <Entrada type="date" name="data" defaultValue={inputData(new Date())} className="max-w-40" />
            <Entrada name="descricao" required placeholder="Novo andamento..." className="min-w-60 flex-1" />
            <Botao>Adicionar</Botao>
          </form>
          {p.andamentos.length === 0 ? (
            <Vazio>Nenhum andamento.</Vazio>
          ) : (
            <ol className="relative ml-1.5 space-y-4 border-l-2 border-border pl-6">
              {p.andamentos.map((a) => (
                <li key={a.id} className="group">
                  <span className="absolute -left-[7px] mt-1 size-3 rounded-full bg-marca ring-4 ring-card" />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{fmtData(a.data)}</p>
                      <p className="text-sm whitespace-pre-wrap">{a.descricao}</p>
                    </div>
                    <form action={excluirAndamento} className="opacity-0 group-hover:opacity-100">
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-muted-foreground hover:text-destructive" title="Excluir">
                        <X size={14} />
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      {aba === "financeiro" && (
        <div className="space-y-4">
          <Card titulo="RPV e precatórios">
            {p.requisicoes.length > 0 && (
              <div className="mb-4 overflow-x-auto">
                <table className="w-full text-[0.8125rem]">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b">
                      {["Tipo", "Nº", "Valor", "% contrato", "Parte do escritório", "Expedida", "Previsão", "Status"].map((c) => (
                        <th key={c} className="py-1.5 pr-3 font-semibold">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {p.requisicoes.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-1.5 pr-3">{financeiro ? <Link className="text-marca hover:underline" href={`/financeiro/rpv?editar=${r.id}`}>{TIPO_REQUISICAO[r.tipo]}</Link> : TIPO_REQUISICAO[r.tipo]}</td>
                        <td className="py-1.5 pr-3 font-mono text-xs">{r.numero ?? "—"}</td>
                        <td className="tabular py-1.5 pr-3">{brl(r.valor)}</td>
                        <td className="tabular py-1.5 pr-3">{r.percentual != null ? `${r.percentual}%` : "—"}</td>
                        <td className="tabular py-1.5 pr-3 font-medium">{brl(parteEscritorio(r))}</td>
                        <td className="py-1.5 pr-3">{fmtData(r.expedidaEm)}</td>
                        <td className="py-1.5 pr-3">{fmtData(r.previsao)}</td>
                        <td className="py-1.5">
                          <Pilula tom={STATUS_REQUISICAO[r.status]?.[1] ?? "cinza"}>{STATUS_REQUISICAO[r.status]?.[0] ?? r.status}</Pilula>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <form action={salvarRequisicao} className="grid gap-3 border-t pt-4 md:grid-cols-6">
              <input type="hidden" name="processoId" value={p.id} />
              <input type="hidden" name="voltar" value={aqui("financeiro")} />
              <Campo rotulo="Tipo">
                <Selecao name="tipo" defaultValue="RPV" opcoes={opcoes(TIPO_REQUISICAO)} />
              </Campo>
              <Campo rotulo="Nº da requisição">
                <Entrada name="numero" />
              </Campo>
              <Campo rotulo="Valor (R$) *">
                <Entrada name="valor" required inputMode="decimal" />
              </Campo>
              <Campo rotulo="% contrato">
                <Entrada name="percentual" inputMode="decimal" defaultValue={p.honorariosExito ?? ""} />
              </Campo>
              <Campo rotulo="Status">
                <Selecao name="status" defaultValue="A_EXPEDIR" opcoes={opcoes(STATUS_REQUISICAO).filter(([v]) => v !== "PAGA")} />
              </Campo>
              <Campo rotulo="Previsão de pagamento">
                <Entrada type="date" name="previsao" />
              </Campo>
              <div className="flex justify-end md:col-span-6">
                <Botao variante="secundario">
                  <Plus size={15} /> Registrar RPV / precatório
                </Botao>
              </div>
            </form>
          </Card>

          {financeiro && (
            <Card
              titulo="Lançamentos do processo"
              acoes={
                <BotaoLink variante="secundario" href={`/financeiro?novo=RECEITA&processo=${p.id}&voltar=${encodeURIComponent(aqui("financeiro"))}`}>
                  Lançar honorário
                </BotaoLink>
              }
            >
              {p.lancamentos.length === 0 ? (
                <Vazio>Nenhum lançamento vinculado.</Vazio>
              ) : (
                <ul className="divide-y text-[0.8125rem]">
                  {p.lancamentos.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 py-1.5">
                      <span>
                        <span className="tabular text-muted-foreground">{fmtData(l.vencimento)}</span> · {l.descricao}
                      </span>
                      <span className="flex items-center gap-2">
                        {l.pagamento ? <Pilula tom="verde">Pago</Pilula> : <Pilula tom="amarelo">Em aberto</Pilula>}
                        <span className={cx("tabular font-medium", l.tipo === "RECEITA" ? "text-success" : "text-destructive")}>{brl(l.valor)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      )}

      {aba === "documentos" && (
        <Card
          titulo="Peças e documentos"
          acoes={
            <BotaoLink variante="secundario" href={`/modelos?cliente=${p.clienteId}&processo=${p.id}`}>
              <FilePlus size={15} /> Gerar peça
            </BotaoLink>
          }
        >
          {p.documentos.length === 0 ? (
            <Vazio>Nenhuma peça gerada. Use “Gerar peça” para criar a partir de um modelo ou com IA.</Vazio>
          ) : (
            <ul className="divide-y text-sm">
              {p.documentos.map((d) => (
                <li key={d.id} className="flex justify-between py-2">
                  <Link href={`/documentos/${d.id}`} className="text-marca hover:underline">
                    {d.titulo}
                  </Link>
                  <span className="text-muted-foreground">{fmtData(d.criadoEm)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}

function Kpi({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 bg-card px-4 py-2.5">
      <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">{rotulo}</p>
      <div className="mt-1 text-[0.875rem] font-semibold">{children}</div>
    </div>
  );
}
