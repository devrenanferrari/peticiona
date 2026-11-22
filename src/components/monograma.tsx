import { MARCA } from "@/marca";
import { cn } from "@/lib/utils";

/** Selo do escritório: as iniciais em Bodoni, com o "&" na cor da marca. */
export function Monograma({ className, claro = false }: { className?: string; claro?: boolean }) {
  const [a, b] = MARCA.monograma;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-[22%] font-display text-[0.95rem] leading-none tracking-tight select-none",
        claro
          ? "bg-[#f4f2ee] text-[#16171a] shadow-[0_1px_2px_rgb(0_0_0/0.25)]"
          : "bg-[linear-gradient(160deg,#2a2b30,#121316)] text-[#f4f2ee] shadow-[0_1px_2px_rgb(0_0_0/0.2),inset_0_1px_0_rgb(255_255_255/0.08)]",
        className,
      )}
    >
      {a}
      <span className="mx-[0.06em] text-marca">&amp;</span>
      {b}
    </span>
  );
}

/** Nome do escritório em Bodoni, com o sufixo em versalete discreto. */
export function Assinatura({ className, sufixo = true }: { className?: string; sufixo?: boolean }) {
  return (
    <span className={cn("grid leading-none", className)}>
      <span className="font-display text-[1.05rem] tracking-tight">{MARCA.nome}</span>
      {sufixo && <span className="mt-1 text-[0.625rem] font-medium tracking-[0.18em] uppercase opacity-60">{MARCA.sufixo}</span>}
    </span>
  );
}
