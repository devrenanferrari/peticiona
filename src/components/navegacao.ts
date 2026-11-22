import {
  ArrowDownCircle, ArrowUpCircle, BarChart3, Bell, Calculator, CalendarDays, CheckSquare, Clock, FileSignature, FileText,
  FolderOpen, Gavel, Handshake, HeartHandshake, KanbanSquare, Landmark, LayoutGrid, Megaphone, Scale, Settings, TrendingUp, Users, Wallet,
  type LucideIcon,
} from "lucide-react";

export type ItemMenu = {
  href: string;
  rotulo: string;
  /** Código de transação: digitado no campo de comando da barra superior. */
  codigo: string;
  icone: LucideIcon;
  /** Só para administradores e financeiro. */
  financeiro?: boolean;
};

export type GrupoMenu = { rotulo: string; itens: ItemMenu[]; financeiro?: boolean };

export const GRUPOS: GrupoMenu[] = [
  {
    rotulo: "Início",
    itens: [{ href: "/painel", rotulo: "Launchpad", codigo: "IN", icone: LayoutGrid }],
  },
  {
    rotulo: "Jurídico",
    itens: [
      { href: "/processos", rotulo: "Processos · 1ª instância", codigo: "PR1", icone: FolderOpen },
      { href: "/processos?aba=2", rotulo: "2ª instância e tribunais", codigo: "PR2", icone: Scale },
      { href: "/audiencias", rotulo: "Audiências", codigo: "AUD", icone: Gavel },
      { href: "/iniciais", rotulo: "Controle de iniciais", codigo: "INI", icone: FileSignature },
      { href: "/intimacoes", rotulo: "Intimações", codigo: "INT", icone: Bell },
      { href: "/atividades", rotulo: "Prazos e tarefas", codigo: "TAR", icone: CheckSquare },
      { href: "/agenda", rotulo: "Agenda", codigo: "AG", icone: CalendarDays },
      { href: "/prazos", rotulo: "Calculadora de prazos", codigo: "CALC", icone: Calculator },
    ],
  },
  {
    rotulo: "Financeiro",
    financeiro: true,
    itens: [
      { href: "/financeiro", rotulo: "Lançamentos", codigo: "FIN", icone: Wallet },
      { href: "/financeiro/receber", rotulo: "Contas a receber", codigo: "CR", icone: ArrowDownCircle },
      { href: "/financeiro/pagar", rotulo: "Contas a pagar", codigo: "CP", icone: ArrowUpCircle },
      { href: "/financeiro/fluxo", rotulo: "Fluxo de caixa projetado", codigo: "FLX", icone: TrendingUp },
      { href: "/financeiro/emprestimos", rotulo: "Empréstimos", codigo: "EMP", icone: Landmark },
      { href: "/financeiro/rpv", rotulo: "RPV e precatórios", codigo: "RPV", icone: Scale },
    ],
  },
  {
    rotulo: "Clientes",
    itens: [
      { href: "/clientes", rotulo: "Contatos", codigo: "CLI", icone: Users },
      { href: "/leads", rotulo: "Leads", codigo: "LD", icone: Megaphone },
      { href: "/crm", rotulo: "CRM", codigo: "CRM", icone: KanbanSquare },
      { href: "/parceiros", rotulo: "Parceiros", codigo: "PAR", icone: Handshake },
    ],
  },
  {
    rotulo: "Produção",
    itens: [
      { href: "/modelos", rotulo: "Modelos e IA", codigo: "MOD", icone: FileText },
      { href: "/horas", rotulo: "Controle de horas", codigo: "HR", icone: Clock },
    ],
  },
  {
    rotulo: "Gestão",
    itens: [
      { href: "/relatorios", rotulo: "Relatórios", codigo: "REL", icone: BarChart3, financeiro: true },
      { href: "/apoio-comunidade", rotulo: "Apoio à comunidade", codigo: "COM", icone: HeartHandshake },
      { href: "/configuracoes", rotulo: "Configurações", codigo: "CFG", icone: Settings },
    ],
  },
];

export const gruposVisiveis = (financeiro: boolean) =>
  GRUPOS.filter((g) => financeiro || !g.financeiro).map((g) => ({ ...g, itens: g.itens.filter((i) => financeiro || !i.financeiro) }));

/** Transações extras que abrem formulários direto. */
export const ATALHOS: { codigo: string; href: string; rotulo: string }[] = [
  { codigo: "PR01", href: "/processos/novo", rotulo: "Novo processo" },
  { codigo: "CLI01", href: "/clientes/novo", rotulo: "Novo contato" },
  { codigo: "AUD01", href: "/audiencias?novo=1", rotulo: "Nova audiência" },
  { codigo: "INI01", href: "/iniciais?novo=1", rotulo: "Nova inicial" },
  { codigo: "TAR01", href: "/atividades?nova=1", rotulo: "Nova tarefa / prazo" },
  { codigo: "FIN01", href: "/financeiro?novo=RECEITA", rotulo: "Lançar receita" },
  { codigo: "FIN02", href: "/financeiro?novo=DESPESA", rotulo: "Lançar despesa" },
  { codigo: "EMP01", href: "/financeiro/emprestimos?novo=1", rotulo: "Novo empréstimo" },
];

export function resolverTransacao(entrada: string, financeiro: boolean): string | null {
  const c = entrada.trim().toUpperCase().replace(/^\/[NO]/, "");
  if (!c) return null;
  const itens = gruposVisiveis(financeiro).flatMap((g) => g.itens);
  const item = itens.find((i) => i.codigo === c);
  if (item) return item.href;
  const atalho = ATALHOS.find((a) => a.codigo === c);
  if (atalho && (financeiro || !/^(FIN|EMP)/.test(atalho.codigo))) return atalho.href;
  return null;
}

/** Item do menu ativo para o caminho atual (considera ?aba=2 em processos). */
export function itemAtivo(caminho: string, busca: string, financeiro: boolean) {
  const itens = gruposVisiveis(financeiro).flatMap((g) => g.itens);
  const atual = caminho + (busca ? `?${busca}` : "");
  if (caminho === "/processos" && new URLSearchParams(busca).get("aba") === "2") return itens.find((i) => i.codigo === "PR2");
  return [...itens]
    .filter((i) => !i.href.includes("?"))
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => atual === i.href || caminho === i.href || caminho.startsWith(i.href + "/"));
}
