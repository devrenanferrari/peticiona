// Helpers para ler FormData em server actions.

export function texto(fd: FormData, campo: string): string | null {
  const v = fd.get(campo);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function obrigatorio(fd: FormData, campo: string): string {
  const v = texto(fd, campo);
  if (!v) throw new Error(`Campo obrigatório: ${campo}`);
  return v;
}

export function numero(fd: FormData, campo: string): number | null {
  const v = texto(fd, campo);
  if (!v) return null;
  // aceita "1.234,56" e "1234.56"
  const normalizado = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

export function data(fd: FormData, campo: string): Date | null {
  const v = texto(fd, campo);
  if (!v) return null;
  // <input type="date"> vem como YYYY-MM-DD; fixa ao meio-dia para não "voltar" um dia por fuso.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function bool(fd: FormData, campo: string): boolean {
  return fd.get(campo) === "on" || fd.get(campo) === "true";
}
