import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { db } from "./db";

const COOKIE = "peticiona_sessao";
const DURACAO_SEGUNDOS = 60 * 60 * 24 * 7;

function chave() {
  const segredo = process.env.AUTH_SECRET;
  if (!segredo) throw new Error("Defina AUTH_SECRET no arquivo .env");
  return new TextEncoder().encode(segredo);
}

/** O cookie só pode ser "secure" em HTTPS; em http (rede local, celular no escritório) o navegador o descartaria. */
async function conexaoSegura() {
  const h = await headers();
  return (h.get("x-forwarded-proto") ?? "").split(",")[0].trim() === "https" || (h.get("origin") ?? "").startsWith("https://");
}

export async function criarSessao(usuarioId: string) {
  const token = await new SignJWT({ uid: usuarioId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_SEGUNDOS}s`)
    .sign(chave());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await conexaoSegura(),
    path: "/",
    maxAge: DURACAO_SEGUNDOS,
  });
}

export async function encerrarSessao() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export const usuarioAtual = cache(async () => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave());
    const usuario = await db.usuario.findUnique({
      where: { id: String(payload.uid) },
      include: { escritorio: true },
    });
    if (!usuario || !usuario.ativo) return null;
    return usuario;
  } catch {
    return null;
  }
});

/** Usuário logado ou redireciona para /login. */
export async function exigirUsuario() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  return usuario;
}

export async function exigirAdmin() {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") redirect("/painel");
  return usuario;
}
