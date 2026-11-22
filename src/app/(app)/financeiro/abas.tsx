import { Aba } from "@/components/kit";
import { GRUPOS } from "@/components/navegacao";

/** Abas do módulo financeiro, vindas do mesmo menu lateral. */
export function AbasFinanceiro({ ativa }: { ativa: string }) {
  const itens = GRUPOS.find((g) => g.financeiro)!.itens;
  return (
    <>
      {itens.map((i) => (
        <Aba key={i.href} href={i.href} ativa={i.href === ativa}>
          {i.rotulo}
        </Aba>
      ))}
    </>
  );
}
