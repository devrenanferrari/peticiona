"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Bell, Briefcase, FolderOpen, LogOut, Monitor, Moon, Plus, Search, Settings, Sun, User, Zap } from "lucide-react";
import { MARCA } from "@/marca";
import { cn } from "@/lib/utils";
import { sair } from "@/app/login/actions";
import { trocarCarteira } from "@/app/(app)/carteira-actions";
import {
  Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { iniciais } from "./menu-lateral";
import { ATALHOS, gruposVisiveis, resolverTransacao } from "./navegacao";

type Item = { id: string; nome: string; extra?: string | null };

const PAPEIS: Record<string, string> = { ADMIN: "Administrador", ADVOGADO: "Advogado(a)", ESTAGIARIO: "Estagiário(a)", FINANCEIRO: "Financeiro" };

const botaoShell = "inline-flex h-8 items-center justify-center gap-1.5 rounded-[5px] px-2 text-[0.8125rem] text-shell-foreground/85 transition-colors hover:bg-white/10 hover:text-shell-foreground";

export function BarraSuperior({
  usuario, financeiro, carteira, carteiraRestrita, intimacoes, clientes, processos,
}: {
  usuario: { nome: string; email: string; papel: string };
  financeiro: boolean;
  carteira: "minha" | "escritorio";
  carteiraRestrita: boolean;
  intimacoes: number;
  clientes: Item[];
  processos: Item[];
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [aberto, setAberto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [comando, setComando] = useState("");
  const [trocando, iniciarTroca] = useTransition();
  const mac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );

  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAberto((a) => !a);
      }
    };
    document.addEventListener("keydown", atalho);
    return () => document.removeEventListener("keydown", atalho);
  }, []);

  const ir = (href: string) => {
    setAberto(false);
    router.push(href);
  };

  const executar = (e: React.FormEvent) => {
    e.preventDefault();
    const destino = resolverTransacao(comando, financeiro);
    if (destino) {
      setComando("");
      router.push(destino);
      return;
    }
    // Não é código: vira busca.
    setConsulta(comando);
    setComando("");
    setAberto(true);
  };

  const itens = gruposVisiveis(financeiro).flatMap((g) => g.itens);
  const atalhos = ATALHOS.filter((a) => financeiro || !/^(FIN|EMP)/.test(a.codigo));

  return (
    <header className="nao-imprimir fixed inset-x-0 top-0 z-40 flex h-11 items-center gap-1 bg-shell px-2 text-shell-foreground shadow-[0_1px_0_rgb(0_0_0/0.25)] md:gap-2 md:px-3">
      <SidebarTrigger className="size-8 text-shell-foreground/85 hover:bg-white/10 hover:text-shell-foreground" />
      <Link href="/painel" className="flex shrink-0 items-center gap-2.5 rounded-[5px] px-1.5 py-1 hover:bg-white/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MARCA.simbolo} alt="" className="h-6 w-auto" />
        <span className="hidden text-[0.875rem] font-semibold tracking-tight sm:inline">{MARCA.nome}</span>
        <span className="hidden h-4 w-px bg-white/25 xl:inline" />
        <span className="hidden text-[0.8125rem] text-shell-foreground/65 xl:inline">{MARCA.sistema}</span>
      </Link>

      <form onSubmit={executar} className="ml-2 hidden lg:block">
        <label className="flex h-8 items-center gap-2 rounded-[5px] bg-white/10 px-2 ring-white/40 focus-within:bg-white/15 focus-within:ring-1">
          <Zap className="size-3.5 text-shell-foreground/60" />
          <input
            value={comando}
            onChange={(e) => setComando(e.target.value)}
            placeholder="Transação (PR1, AUD, FLX…)"
            aria-label="Código de transação"
            className="w-40 bg-transparent font-mono text-[0.8125rem] uppercase placeholder:font-sans placeholder:normal-case placeholder:text-shell-foreground/50 focus:outline-none xl:w-56"
          />
        </label>
      </form>

      <div className="ml-auto flex items-center gap-0.5 md:gap-1">
        <button onClick={() => setAberto(true)} className={cn(botaoShell, "md:w-44 md:justify-start md:bg-white/10 xl:w-52")} aria-label="Buscar">
          <Search className="size-4" />
          <span className="hidden flex-1 text-left text-shell-foreground/60 md:inline">Buscar</span>
          <kbd className="hidden font-sans text-[0.6875rem] text-shell-foreground/45 md:inline">{mac ? "⌘K" : "Ctrl K"}</kbd>
        </button>

        {!carteiraRestrita && (
          <div className="mx-1 hidden h-8 items-center rounded-[5px] bg-white/10 p-0.5 text-[0.75rem] xl:flex" title="Carteira exibida nas listas">
            {(["minha", "escritorio"] as const).map((v) => (
              <button
                key={v}
                disabled={trocando}
                onClick={() => iniciarTroca(() => trocarCarteira(v))}
                className={cn("h-7 rounded-[4px] px-2.5 font-medium transition-colors", carteira === v ? "bg-white text-shell" : "text-shell-foreground/75 hover:text-shell-foreground")}
              >
                {v === "minha" ? "Minha carteira" : "Escritório"}
              </button>
            ))}
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(botaoShell, "bg-marca px-2.5 font-medium text-white hover:bg-marca/85")}>
              <Plus className="size-4" strokeWidth={2.5} /> <span className="hidden sm:inline">Criar</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {atalhos.map((a) => (
              <DropdownMenuItem key={a.codigo} onClick={() => router.push(a.href)}>
                {a.rotulo}
                <span className="ml-auto font-mono text-[0.6875rem] text-muted-foreground">{a.codigo}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Link href="/intimacoes" className={cn(botaoShell, "relative w-8")} aria-label={`Intimações não lidas: ${intimacoes}`}>
          <Bell className="size-4" />
          {intimacoes > 0 && (
            <span className="tabular absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-bold text-white">{intimacoes}</span>
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(botaoShell, "px-1")} aria-label="Menu do usuário">
              <span className="flex size-7 items-center justify-center rounded-full bg-marca text-[0.6875rem] font-semibold text-white">{iniciais(usuario.nome)}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-semibold">{usuario.nome}</p>
              <p className="text-xs text-muted-foreground">{usuario.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {PAPEIS[usuario.papel] ?? usuario.papel}
                {carteiraRestrita && " · carteira própria"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!carteiraRestrita && (
              <DropdownMenuItem className="xl:hidden" onClick={() => iniciarTroca(() => trocarCarteira(carteira === "minha" ? "escritorio" : "minha"))}>
                <Briefcase /> Ver {carteira === "minha" ? "carteira do escritório" : "minha carteira"}
              </DropdownMenuItem>
            )}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Sun /> Tema
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun /> Claro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon /> Escuro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Monitor /> Sistema
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem asChild>
              <Link href="/configuracoes">
                <Settings /> Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => sair()}>
              <LogOut /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandDialog
        open={aberto}
        onOpenChange={(v) => {
          setAberto(v);
          if (!v) setConsulta("");
        }}
        title="Busca"
        description={`Buscar em ${MARCA.nome}`}
        className="sm:max-w-2xl"
      >
        <Command loop>
          <CommandInput value={consulta} onValueChange={setConsulta} placeholder="Cliente, nº do processo, tela ou código de transação..." />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup heading="Criar">
              {atalhos.map((a) => (
                <CommandItem key={a.codigo} value={`${a.codigo} ${a.rotulo}`} onSelect={() => ir(a.href)}>
                  <Plus /> {a.rotulo}
                  <CommandShortcut className="font-mono">{a.codigo}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Telas">
              {itens.map(({ href, rotulo, codigo, icone: Icone }) => (
                <CommandItem key={codigo} value={`${codigo} ${rotulo}`} onSelect={() => ir(href)}>
                  <Icone /> {rotulo}
                  <CommandShortcut className="font-mono">{codigo}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            {clientes.length > 0 && (
              <CommandGroup heading="Contatos">
                {clientes.map((c) => (
                  <CommandItem key={c.id} value={`cliente ${c.nome} ${c.extra ?? ""} ${c.id}`} onSelect={() => ir(`/clientes/${c.id}`)}>
                    <User /> {c.nome}
                    {c.extra && <CommandShortcut className="whitespace-nowrap">{c.extra}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {processos.length > 0 && (
              <CommandGroup heading="Processos">
                {processos.map((p) => (
                  <CommandItem key={p.id} value={`processo ${p.nome} ${p.extra ?? ""} ${p.extra?.replace(/\D/g, "") ?? ""} ${p.id}`} onSelect={() => ir(`/processos/${p.id}`)}>
                    <FolderOpen /> <span className="truncate">{p.nome}</span>
                    {p.extra && <CommandShortcut className="font-mono whitespace-nowrap">{p.extra}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </header>
  );
}
