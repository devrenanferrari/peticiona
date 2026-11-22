import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { exigirUsuario } from "./auth";

type Usuario = Awaited<ReturnType<typeof exigirUsuario>>;

export const COOKIE_CARTEIRA = "carteira";

/** Financeiro, empréstimos e RPVs ficam restritos a administradores e ao papel Financeiro. */
export const podeFinanceiro = (u: Pick<Usuario, "papel">) => u.papel === "ADMIN" || u.papel === "FINANCEIRO";

export async function exigirFinanceiro() {
  const u = await exigirUsuario();
  if (!podeFinanceiro(u)) redirect("/painel");
  return u;
}

/**
 * "minha" = só os processos em que o usuário é responsável; "escritorio" = todos.
 * Usuários com carteira restrita sempre veem só a própria.
 */
export async function escopoCarteira(u: Usuario): Promise<"minha" | "escritorio"> {
  if (u.carteiraRestrita) return "minha";
  return (await cookies()).get(COOKIE_CARTEIRA)?.value === "minha" ? "minha" : "escritorio";
}

/** Filtro de processos conforme a carteira escolhida. */
export async function filtroCarteira(u: Usuario) {
  return (await escopoCarteira(u)) === "minha" ? { responsavelId: u.id } : {};
}

/** Bloqueia o acesso de usuários restritos a processos de outra pessoa. */
export function exigirAcessoProcesso(u: Usuario, p: { responsavelId: string | null }) {
  if (u.carteiraRestrita && p.responsavelId !== u.id) notFound();
}
