import { cookies } from "next/headers";
import { BarraSuperior } from "@/components/barra-superior";
import { MenuLateral } from "@/components/menu-lateral";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { escopoCarteira, podeFinanceiro } from "@/lib/acesso";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtCNJ, fmtDocumento } from "@/lib/format";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  const e = usuario.escritorioId;
  const carteira = await escopoCarteira(usuario);
  const doUsuario = carteira === "minha" ? { responsavelId: usuario.id } : {};
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [intimacoesNaoLidas, leadsNovos, prazosVencidos, clientes, processos] = await Promise.all([
    db.intimacao.count({ where: { escritorioId: e, lida: false } }),
    db.lead.count({ where: { escritorioId: e, status: "NOVO" } }),
    db.tarefa.count({ where: { escritorioId: e, responsavelId: usuario.id, concluida: false, prazo: { lt: hoje } } }),
    db.cliente.findMany({ where: { escritorioId: e }, select: { id: true, nome: true, documento: true }, orderBy: { atualizadoEm: "desc" }, take: 300 }),
    db.processo.findMany({ where: { escritorioId: e, ...doUsuario }, select: { id: true, titulo: true, numero: true }, orderBy: { atualizadoEm: "desc" }, take: 300 }),
  ]);
  const menuAberto = (await cookies()).get("sidebar_state")?.value !== "false";
  const financeiro = podeFinanceiro(usuario);

  return (
    <SidebarProvider defaultOpen={menuAberto} className="min-h-[calc(100svh-2.75rem)] pt-11">
      <BarraSuperior
        usuario={{ nome: usuario.nome, email: usuario.email, papel: usuario.papel }}
        financeiro={financeiro}
        carteira={carteira}
        carteiraRestrita={usuario.carteiraRestrita}
        intimacoes={intimacoesNaoLidas}
        clientes={clientes.map((c) => ({ id: c.id, nome: c.nome, extra: fmtDocumento(c.documento) || null }))}
        processos={processos.map((p) => ({ id: p.id, nome: p.titulo, extra: fmtCNJ(p.numero) || null }))}
      />
      <MenuLateral financeiro={financeiro} contadores={{ INT: intimacoesNaoLidas, LD: leadsNovos, TAR: prazosVencidos }} />
      <SidebarInset className="min-w-0 bg-background">
        <main className="w-full flex-1 px-3 pt-4 pb-16 md:px-6 md:pt-5">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
