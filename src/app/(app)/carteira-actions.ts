"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_CARTEIRA } from "@/lib/acesso";

export async function trocarCarteira(escopo: "minha" | "escritorio") {
  (await cookies()).set(COOKIE_CARTEIRA, escopo, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
