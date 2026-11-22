import type { Processo } from "@prisma/client";
import { AreaTexto, Botao, Campo, Card, Entrada, Selecao } from "@/components/kit";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtCNJ, inputData } from "@/lib/format";
import { INSTANCIAS, RECURSOS } from "@/lib/rotulos";
import { salvarProcesso } from "./actions";

export const AREAS = ["Cível", "Trabalhista", "Previdenciário", "Família", "Criminal", "Tributário", "Empresarial", "Consumidor", "Administrativo", "Imobiliário", "Ambiental", "Bancário", "Saúde", "Digital", "Outra"];
export const STATUS: [string, string][] = [["ATIVO", "Ativo"], ["SUSPENSO", "Suspenso"], ["ENCERRADO", "Encerrado"], ["ARQUIVADO", "Arquivado"]];

export async function FormProcesso({ processo, clienteId, instancia }: { processo?: Processo; clienteId?: string; instancia?: string }) {
  const u = await exigirUsuario();
  const [clientes, usuarios, fases] = await Promise.all([
    db.cliente.findMany({ where: { escritorioId: u.escritorioId }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    db.usuario.findMany({ where: { escritorioId: u.escritorioId, ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    db.fase.findMany({ where: { escritorioId: u.escritorioId }, orderBy: { ordem: "asc" }, include: { etapas: { orderBy: { ordem: "asc" } } } }),
  ]);
  const p = processo;
  const etapas = fases.flatMap((f) => f.etapas.map((e) => [e.id, `${f.nome} › ${e.nome}`] as [string, string]));

  return (
    <form action={salvarProcesso} className="space-y-6">
      {p && <input type="hidden" name="id" value={p.id} />}
      <Card titulo="Processo">
        <div className="grid gap-4 md:grid-cols-4">
          <Campo rotulo="Cliente *" className="md:col-span-2">
            <Selecao name="clienteId" required defaultValue={p?.clienteId ?? clienteId ?? ""} vazio="Selecione..." opcoes={clientes.map((c) => [c.id, c.nome])} />
          </Campo>
          <Campo rotulo="Título / objeto *" className="md:col-span-2">
            <Entrada name="titulo" required defaultValue={p?.titulo} placeholder="Ex.: Reclamação trabalhista" />
          </Campo>
          <Campo rotulo="Número (CNJ)" className="md:col-span-2" dica="Deixe vazio se ainda não foi distribuído">
            <Entrada name="numero" defaultValue={fmtCNJ(p?.numero)} placeholder="0000000-00.0000.0.00.0000" />
          </Campo>
          <Campo rotulo="Área">
            <Selecao name="area" defaultValue={p?.area ?? ""} vazio="—" opcoes={AREAS} />
          </Campo>
          <Campo rotulo="Status">
            <Selecao name="status" defaultValue={p?.status ?? "ATIVO"} opcoes={STATUS} />
          </Campo>
          <Campo rotulo="Tipo de ação" className="md:col-span-2">
            <Entrada name="tipoAcao" defaultValue={p?.tipoAcao ?? ""} placeholder="Ex.: Ação de cobrança" />
          </Campo>
          <Campo rotulo="Parte contrária" className="md:col-span-2">
            <Entrada name="parteContraria" defaultValue={p?.parteContraria ?? ""} />
          </Campo>
          <Campo rotulo="Posição do cliente">
            <Selecao name="posicaoCliente" defaultValue={p?.posicaoCliente ?? ""} vazio="—" opcoes={["Autor", "Réu", "Reclamante", "Reclamado", "Requerente", "Requerido", "Terceiro interessado"]} />
          </Campo>
          <Campo rotulo="Responsável">
            <Selecao name="responsavelId" defaultValue={p?.responsavelId ?? u.id} vazio="—" opcoes={usuarios.map((x) => [x.id, x.nome])} />
          </Campo>
          <Campo rotulo="Etapa no CRM" className="md:col-span-2">
            <Selecao name="etapaId" defaultValue={p?.etapaId ?? ""} vazio="—" opcoes={etapas} />
          </Campo>
        </div>
      </Card>

      <Card titulo="Juízo">
        <div className="grid gap-4 md:grid-cols-4">
          <Campo rotulo="Tribunal">
            <Entrada name="tribunal" defaultValue={p?.tribunal ?? ""} placeholder="TJSP, TRT2, TRF3..." />
          </Campo>
          <Campo rotulo="Vara (1ª instância / origem)">
            <Entrada name="vara" defaultValue={p?.vara ?? ""} />
          </Campo>
          <Campo rotulo="Comarca">
            <Entrada name="comarca" defaultValue={p?.comarca ?? ""} />
          </Campo>
          <Campo rotulo="Instância">
            <Selecao name="instancia" defaultValue={p?.instancia ?? instancia ?? "1ª instância"} vazio="—" opcoes={INSTANCIAS} />
          </Campo>
          <Campo rotulo="Distribuído em">
            <Entrada type="date" name="distribuidoEm" defaultValue={inputData(p?.distribuidoEm)} />
          </Campo>
        </div>
      </Card>

      <Card titulo="2ª instância e tribunais" descricao="Preencha quando o processo estiver em grau de recurso. A vara acima fica como vara de origem.">
        <div className="grid gap-4 md:grid-cols-4">
          <Campo rotulo="Recurso">
            <Entrada name="recurso" list="recursos" defaultValue={p?.recurso ?? ""} placeholder="Apelação, agravo..." />
            <datalist id="recursos">
              {RECURSOS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Campo>
          <Campo rotulo="Turma / Câmara">
            <Entrada name="orgaoJulgador" defaultValue={p?.orgaoJulgador ?? ""} placeholder="Ex.: 5ª Câmara Cível" />
          </Campo>
          <Campo rotulo="Relator">
            <Entrada name="relator" defaultValue={p?.relator ?? ""} />
          </Campo>
          <Campo rotulo="Sessão de julgamento">
            <Entrada type="date" name="sessaoEm" defaultValue={inputData(p?.sessaoEm)} />
          </Campo>
          <Campo rotulo="Matéria / o que será julgado" className="md:col-span-2">
            <Entrada name="materia" defaultValue={p?.materia ?? ""} />
          </Campo>
          <Campo rotulo="Situação" className="md:col-span-2">
            <Entrada name="situacao" list="situacoes" defaultValue={p?.situacao ?? ""} placeholder="Concluso ao relator, pautado, aguardando acórdão..." />
            <datalist id="situacoes">
              {["Aguardando distribuição", "Concluso ao relator", "Aguardando contrarrazões", "Pautado", "Julgado – aguardando acórdão", "Acórdão publicado", "Trânsito em julgado"].map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Campo>
        </div>
      </Card>

      <Card titulo="Valores">
        <div className="grid gap-4 md:grid-cols-3">
          <Campo rotulo="Valor da causa (R$)">
            <Entrada name="valorCausa" inputMode="decimal" defaultValue={p?.valorCausa ?? ""} />
          </Campo>
          <Campo rotulo="Honorários contratuais (R$)">
            <Entrada name="honorarios" inputMode="decimal" defaultValue={p?.honorarios ?? ""} />
          </Campo>
          <Campo rotulo="% do contrato (êxito)">
            <Entrada name="honorariosExito" inputMode="decimal" defaultValue={p?.honorariosExito ?? ""} />
          </Campo>
        </div>
      </Card>

      <Card titulo="Observações">
        <AreaTexto name="observacoes" defaultValue={p?.observacoes ?? ""} />
      </Card>

      <div className="flex justify-end">
        <Botao type="submit">{p ? "Salvar alterações" : "Cadastrar processo"}</Botao>
      </div>
    </form>
  );
}
