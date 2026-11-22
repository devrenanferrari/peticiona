import Link from "next/link";
import { FolderOpen, Hourglass, Inbox, Settings2, Wallet } from "lucide-react";
import { Botao, BotaoLink, Cabecalho, Indicador, Vazio, cx } from "@/components/kit";
import { filtroCarteira } from "@/lib/acesso";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, diasAPartirDeHoje } from "@/lib/format";
import { Kanban } from "./kanban";

export const metadata = { title: "CRM" };

export default async function Crm({ searchParams }: { searchParams: Promise<{ fase?: string; responsavel?: string }> }) {
  const sp = await searchParams;
  const u = await exigirUsuario();
  const fases = await db.fase.findMany({
    where: { escritorioId: u.escritorioId },
    orderBy: { ordem: "asc" },
    include: { etapas: { orderBy: { ordem: "asc" } } },
  });
  if (fases.length === 0) {
    return (
      <>
        <Cabecalho titulo="CRM" />
        <Vazio>
          Nenhuma fase configurada. <Link href="/configuracoes" className="text-primary underline">Configure o funil</Link>.
        </Vazio>
      </>
    );
  }
  // Sem fase escolhida, abre a primeira que tem processos.
  const contagem = await db.processo.groupBy({ by: ["etapaId"], where: { escritorioId: u.escritorioId, etapaId: { not: null } }, _count: true });
  const comProcessos = fases.find((f) => f.etapas.some((et) => contagem.some((c) => c.etapaId === et.id)));
  const fase = fases.find((f) => f.id === sp.fase) ?? comProcessos ?? fases[0];
  const etapaIds = fase.etapas.map((e) => e.id);

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const trintaDias = diasAPartirDeHoje(-30);

  const [processos, usuarios] = await Promise.all([
    db.processo.findMany({
      where: { escritorioId: u.escritorioId, etapaId: { in: etapaIds }, ...(sp.responsavel ? { responsavelId: sp.responsavel } : {}), ...(await filtroCarteira(u)) },
      include: { cliente: true, responsavel: true },
      orderBy: { atualizadoEm: "desc" },
    }),
    db.usuario.findMany({ where: { escritorioId: u.escritorioId, ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  const honorarios = processos.reduce((s, p) => s + (p.honorarios ?? 0), 0);
  const recebidosMes = processos.filter((p) => p.criadoEm >= inicioMes).length;
  const estagnados = processos.filter((p) => p.atualizadoEm < trintaDias).length;

  return (
    <>
      <Cabecalho
        titulo="CRM"
        subtitulo="Arraste os processos entre as etapas"
        acoes={
          <BotaoLink variante="secundario" href="/configuracoes#funil">
            <Settings2 size={16} /> Configurar funil
          </BotaoLink>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="Processos nesta fase" valor={processos.length} icone={FolderOpen} />
        <Indicador rotulo="Recebidos este mês" valor={recebidosMes} icone={Inbox} tom="sucesso" />
        <Indicador rotulo="Honorários na fase" valor={brl(honorarios)} icone={Wallet} tom="sucesso" />
        <Indicador rotulo="Estagnados (+30 dias)" valor={estagnados} icone={Hourglass} tom={estagnados ? "alerta" : "primario"} />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1 rounded-xl border bg-muted/50 p-1">
          {fases.map((f) => (
            <Link
              key={f.id}
              href={`/crm?fase=${f.id}${sp.responsavel ? `&responsavel=${sp.responsavel}` : ""}`}
              className={cx(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                f.id === fase.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.nome}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2">
          <input type="hidden" name="fase" value={fase.id} />
          <select name="responsavel" defaultValue={sp.responsavel ?? ""} className="campo w-56">
            <option value="">Todos os responsáveis</option>
            {usuarios.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </select>
          <Botao variante="secundario">Filtrar</Botao>
        </form>
      </div>

      <Kanban
        colunas={fase.etapas.map((e) => ({ id: e.id, nome: e.nome }))}
        cartoes={processos.map((p) => ({
          id: p.id,
          titulo: p.titulo,
          cliente: p.cliente.nome,
          area: p.area,
          responsavel: p.responsavel?.nome ?? null,
          etapaId: p.etapaId!,
          honorarios: p.honorarios,
        }))}
      />
    </>
  );
}
