import Link from "next/link";
import { ExternalLink, Globe, Mail, MessageCircle, Phone, Plus, Trash2, UserCheck, UserPlus, Users } from "lucide-react";
import { AreaTexto, Botao, BotaoLink, Cabecalho, Campo, Card, Entrada, Indicador, Selecao, Vazio, cx } from "@/components/kit";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDataHora } from "@/lib/format";
import { AREAS_SITE } from "@/site/config";
import { converterLead, criarLead, excluirLead, salvarObservacaoLead } from "./actions";
import { STATUS_LEAD, SeletorStatusLead } from "./status-lead";

export const metadata = { title: "Leads" };

export default async function Leads({ searchParams }: { searchParams: Promise<{ status?: string; novo?: string }> }) {
  const sp = await searchParams;
  const u = await exigirUsuario();
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [leads, contagem, doMes] = await Promise.all([
    db.lead.findMany({ where: { escritorioId: u.escritorioId, ...(sp.status ? { status: sp.status } : { status: { not: "DESCARTADO" } }) }, orderBy: { criadoEm: "desc" } }),
    db.lead.groupBy({ by: ["status"], where: { escritorioId: u.escritorioId }, _count: true }),
    db.lead.count({ where: { escritorioId: u.escritorioId, criadoEm: { gte: inicioMes } } }),
  ]);
  const n = (s: string) => contagem.find((c) => c.status === s)?._count ?? 0;
  const total = contagem.reduce((s, c) => s + c._count, 0);
  const conversao = total ? Math.round((n("CONVERTIDO") / total) * 100) : 0;

  return (
    <>
      <Cabecalho
        titulo="Leads"
        subtitulo={
          <>
            Contatos captados pelo{" "}
            <Link href="/" target="_blank" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              site do escritório <ExternalLink className="size-3" />
            </Link>{" "}
            e outros canais
          </>
        }
        acoes={
          <BotaoLink href="/leads?novo=1">
            <Plus className="size-4" /> Lead manual
          </BotaoLink>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="Novos (aguardando retorno)" valor={n("NOVO")} icone={UserPlus} tom={n("NOVO") ? "alerta" : "primario"} />
        <Indicador rotulo="Em negociação" valor={n("EM_CONTATO") + n("PROPOSTA")} icone={Users} />
        <Indicador rotulo="Captados este mês" valor={doMes} icone={Globe} />
        <Indicador rotulo="Taxa de conversão" valor={`${conversao}%`} icone={UserCheck} tom="sucesso" detalhe={`${n("CONVERTIDO")} de ${total} viraram clientes`} />
      </div>

      {sp.novo && (
        <Card titulo="Novo lead" className="mb-6">
          <form action={criarLead} className="grid gap-4 md:grid-cols-3">
            <Campo rotulo="Nome *">
              <Entrada name="nome" required autoFocus />
            </Campo>
            <Campo rotulo="E-mail *">
              <Entrada name="email" type="email" required />
            </Campo>
            <Campo rotulo="Telefone">
              <Entrada name="telefone" />
            </Campo>
            <Campo rotulo="Empresa">
              <Entrada name="empresa" />
            </Campo>
            <Campo rotulo="Assunto">
              <Selecao name="area" vazio="—" opcoes={AREAS_SITE} />
            </Campo>
            <Campo rotulo="Origem">
              <Selecao name="origem" opcoes={[["INDICACAO", "Indicação"], ["WHATSAPP", "WhatsApp"], ["EVENTO", "Evento"], ["SITE", "Site"], ["OUTRO", "Outro"]]} />
            </Campo>
            <Campo rotulo="Mensagem" className="md:col-span-3">
              <AreaTexto name="mensagem" rows={2} />
            </Campo>
            <div className="flex justify-end gap-2 md:col-span-3">
              <BotaoLink variante="secundario" href="/leads">
                Cancelar
              </BotaoLink>
              <Botao>Salvar lead</Botao>
            </div>
          </form>
        </Card>
      )}

      <nav className="mb-5 flex flex-wrap gap-1 rounded-xl border bg-muted/50 p-1 w-fit">
        {[["", "Ativos"], ...Object.entries(STATUS_LEAD).map(([v, [r]]) => [v, r])].map(([v, r]) => (
          <Link
            key={v}
            href={v ? `/leads?status=${v}` : "/leads"}
            className={cx("rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", (sp.status ?? "") === v ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {r}
          </Link>
        ))}
      </nav>

      {leads.length === 0 ? (
        <Vazio icone={Globe}>Nenhum lead aqui. Os contatos enviados pelo site aparecem automaticamente nesta lista.</Vazio>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {leads.map((l) => (
            <article key={l.id} className="flex min-w-0 flex-col rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{l.nome}</h3>
                  <p className="truncate text-sm text-muted-foreground">{l.empresa ?? "Pessoa física"}{l.area ? ` · ${l.area}` : ""}</p>
                </div>
                <SeletorStatusLead id={l.id} status={l.status} />
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary">
                  <Mail className="size-3.5" /> {l.email}
                </a>
                {l.telefone && (
                  <>
                    <a href={`tel:${l.telefone.replace(/\D/g, "")}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary">
                      <Phone className="size-3.5" /> {l.telefone}
                    </a>
                    <a
                      href={`https://wa.me/55${l.telefone.replace(/\D/g, "").replace(/^55/, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-success hover:underline"
                    >
                      <MessageCircle className="size-3.5" /> WhatsApp
                    </a>
                  </>
                )}
              </div>

              {l.mensagem && <p className="mt-3 line-clamp-3 rounded-lg bg-muted/50 p-3 text-sm text-foreground/80">{l.mensagem}</p>}

              <form action={salvarObservacaoLead} className="mt-3">
                <input type="hidden" name="id" value={l.id} />
                <textarea
                  name="observacoes"
                  defaultValue={l.observacoes ?? ""}
                  placeholder="Anotações internas (pressione Salvar)"
                  rows={1}
                  className="campo min-h-9 resize-y text-xs"
                />
                <button className="mt-1 text-xs font-medium text-primary hover:underline">Salvar anotação</button>
              </form>

              <div className="mt-auto flex items-center justify-between gap-2 border-t pt-4 mt-4">
                <span className="text-xs text-muted-foreground">
                  {l.origem === "SITE" ? "Via site" : l.origem} · {fmtDataHora(l.criadoEm)}
                </span>
                <div className="flex items-center gap-1">
                  <form action={excluirLead}>
                    <input type="hidden" name="id" value={l.id} />
                    <button className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Excluir lead">
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                  {l.clienteId ? (
                    <BotaoLink variante="secundario" href={`/clientes/${l.clienteId}`} className="h-8">
                      Ver cliente
                    </BotaoLink>
                  ) : (
                    <form action={converterLead}>
                      <input type="hidden" name="id" value={l.id} />
                      <Botao variante="sucesso" className="h-8">
                        <UserCheck className="size-4" /> Converter em cliente
                      </Botao>
                    </form>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
