"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuBadge, SidebarMenuButton,
  SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";
import { gruposVisiveis, itemAtivo } from "./navegacao";

export function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter((p) => p && !/^(dr|dra)\.?$/i.test(p))
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Navegação lateral por módulos, abaixo da barra superior. Mostra o código de transação de cada tela. */
export function MenuLateral({ financeiro, contadores }: { financeiro: boolean; contadores: Record<string, number> }) {
  const caminho = usePathname();
  const busca = useSearchParams().toString();
  const ativo = itemAtivo(caminho, busca, financeiro);

  return (
    <Sidebar collapsible="icon" className="nao-imprimir top-11 h-[calc(100svh-2.75rem)]">
      <SidebarContent className="gap-0 py-1">
        {gruposVisiveis(financeiro).map((g) => (
          <SidebarGroup key={g.rotulo} className="py-1">
            <SidebarGroupLabel className="h-6 text-[0.6875rem] font-semibold tracking-wide text-sidebar-foreground/55 uppercase">{g.rotulo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-px">
                {g.itens.map(({ href, rotulo, codigo, icone: Icone }) => {
                  const n = contadores[codigo] ?? 0;
                  return (
                    <SidebarMenuItem key={codigo}>
                      <SidebarMenuButton
                        asChild
                        isActive={ativo?.codigo === codigo}
                        tooltip={`${rotulo} (${codigo})`}
                        className="group/item h-7 rounded-[4px] text-[0.8125rem] text-sidebar-accent-foreground/85 [&>svg]:size-4 [&>svg]:text-sidebar-foreground/60 data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-marca data-[active=true]:shadow-[inset_3px_0_0_var(--marca)] data-[active=true]:[&>svg]:text-marca"
                      >
                        <Link href={href}>
                          <Icone />
                          <span className="flex-1 truncate">{rotulo}</span>
                          {n === 0 && <span className="font-mono text-[0.625rem] text-sidebar-foreground/35 opacity-0 transition-opacity group-hover/item:opacity-100">{codigo}</span>}
                        </Link>
                      </SidebarMenuButton>
                      {n > 0 && (
                        <SidebarMenuBadge className="tabular top-[0.3rem] h-[1.125rem] min-w-[1.125rem] rounded-full bg-destructive px-1.5 text-[0.6875rem] font-semibold text-white peer-data-[active=true]/menu-button:text-white">
                          {n}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
