import { X } from "lucide-react";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Botao, Cabecalho, Campo, Card, Entrada, Etiqueta, Selecao, Tabela, Td } from "@/components/kit";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { salvarCategoria } from "../financeiro/actions";
import {
  alterarPapel, alternarAtivo, alternarCarteiraRestrita, criarEtapa, criarFase, criarUsuario, excluirCategoria, excluirEtapa, excluirFase, salvarEscritorio, salvarPerfil,
} from "./actions";

export const metadata = { title: "Configurações" };

const PAPEIS: [string, string][] = [["ADMIN", "Administrador"], ["ADVOGADO", "Advogado"], ["ESTAGIARIO", "Estagiário"], ["FINANCEIRO", "Financeiro"]];

export default async function Configuracoes() {
  const u = await exigirUsuario();
  const admin = u.papel === "ADMIN";
  const [usuarios, fases, categorias] = await Promise.all([
    db.usuario.findMany({ where: { escritorioId: u.escritorioId }, orderBy: { nome: "asc" } }),
    db.fase.findMany({ where: { escritorioId: u.escritorioId }, orderBy: { ordem: "asc" }, include: { etapas: { orderBy: { ordem: "asc" }, include: { _count: { select: { processos: true } } } } } }),
    db.categoriaFinanceira.findMany({ where: { escritorioId: u.escritorioId }, orderBy: [{ tipo: "asc" }, { nome: "asc" }] }),
  ]);
  const e = u.escritorio;

  return (
    <>
      <Cabecalho titulo="Configurações" codigo="CFG" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card titulo="Meu perfil">
          <form action={salvarPerfil} className="grid gap-3 md:grid-cols-2">
            <Campo rotulo="Nome">
              <Entrada name="nome" required defaultValue={u.nome} />
            </Campo>
            <Campo rotulo="OAB">
              <Entrada name="oab" defaultValue={u.oab ?? ""} placeholder="UF 000.000" />
            </Campo>
            <Campo rotulo="Meta mensal de pontos" dica="Soma dos pontos das tarefas concluídas no mês">
              <Entrada name="metaPontos" type="number" min={0} defaultValue={u.metaPontos} />
            </Campo>
            <Campo rotulo="Nova senha" dica="Deixe vazio para manter">
              <Entrada name="senha" type="password" minLength={8} />
            </Campo>
            <div className="flex justify-end md:col-span-2">
              <Botao>Salvar perfil</Botao>
            </div>
          </form>
        </Card>

        <Card titulo="Escritório">
          <form action={salvarEscritorio} className="grid gap-3 md:grid-cols-2">
            <fieldset disabled={!admin} className="contents">
              <Campo rotulo="Nome" className="md:col-span-2">
                <Entrada name="nome" required defaultValue={e.nome} />
              </Campo>
              <Campo rotulo="CNPJ">
                <Entrada name="cnpj" defaultValue={e.cnpj ?? ""} />
              </Campo>
              <Campo rotulo="Registro OAB (sociedade)">
                <Entrada name="oab" defaultValue={e.oab ?? ""} />
              </Campo>
              <Campo rotulo="Endereço" className="md:col-span-2">
                <Entrada name="endereco" defaultValue={e.endereco ?? ""} />
              </Campo>
              <Campo rotulo="Telefone">
                <Entrada name="telefone" defaultValue={e.telefone ?? ""} />
              </Campo>
              <Campo rotulo="E-mail">
                <Entrada name="email" type="email" defaultValue={e.email ?? ""} />
              </Campo>
              {admin && (
                <div className="flex justify-end md:col-span-2">
                  <Botao>Salvar escritório</Botao>
                </div>
              )}
            </fieldset>
          </form>
        </Card>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Equipe e autorizações</h2>
      <p className="mb-3 text-[0.8125rem] text-muted-foreground">
        Financeiro, empréstimos e RPVs: só Administrador e Financeiro. “Carteira própria”: a pessoa só vê os processos, audiências e iniciais em que é responsável.
      </p>
      <Tabela colunas={["Nome", "E-mail", "OAB", "Papel", "Carteira", "Status", ""]}>
        {usuarios.map((x) => (
          <tr key={x.id}>
            <Td className="font-medium">{x.nome}</Td>
            <Td>{x.email}</Td>
            <Td>{x.oab ?? "—"}</Td>
            <Td>
              {admin && x.id !== u.id ? (
                <form action={alterarPapel} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={x.id} />
                  <Selecao name="papel" defaultValue={x.papel} opcoes={PAPEIS} className="h-7 w-36 text-xs" />
                  <button className="text-xs text-marca hover:underline">Aplicar</button>
                </form>
              ) : (
                PAPEIS.find(([v]) => v === x.papel)?.[1] ?? x.papel
              )}
            </Td>
            <Td>
              {x.papel === "ADMIN" ? (
                <span className="text-muted-foreground">Escritório</span>
              ) : admin ? (
                <form action={alternarCarteiraRestrita}>
                  <input type="hidden" name="id" value={x.id} />
                  <button className="text-[0.8125rem] hover:underline" title="Clique para alternar">
                    <Etiqueta cor={x.carteiraRestrita ? "amarelo" : "azul"}>{x.carteiraRestrita ? "Só a própria" : "Escritório"}</Etiqueta>
                  </button>
                </form>
              ) : (
                <Etiqueta cor={x.carteiraRestrita ? "amarelo" : "azul"}>{x.carteiraRestrita ? "Só a própria" : "Escritório"}</Etiqueta>
              )}
            </Td>
            <Td>
              <Etiqueta cor={x.ativo ? "verde" : "cinza"}>{x.ativo ? "Ativo" : "Inativo"}</Etiqueta>
            </Td>
            <Td>
              {admin && x.id !== u.id && (
                <form action={alternarAtivo}>
                  <input type="hidden" name="id" value={x.id} />
                  <button className="text-sm text-primary hover:underline">{x.ativo ? "Desativar" : "Reativar"}</button>
                </form>
              )}
            </Td>
          </tr>
        ))}
      </Tabela>
      {admin && (
        <Card titulo="Adicionar usuário" className="mt-4">
          <form action={criarUsuario} className="grid gap-3 md:grid-cols-6">
            <Campo rotulo="Nome" className="md:col-span-2">
              <Entrada name="nome" required />
            </Campo>
            <Campo rotulo="E-mail" className="md:col-span-2">
              <Entrada name="email" type="email" required />
            </Campo>
            <Campo rotulo="Senha inicial">
              <Entrada name="senha" type="password" minLength={8} required />
            </Campo>
            <Campo rotulo="Papel">
              <Selecao name="papel" defaultValue="ADVOGADO" opcoes={PAPEIS} />
            </Campo>
            <Campo rotulo="OAB">
              <Entrada name="oab" />
            </Campo>
            <label className="flex items-end gap-2 pb-2 text-[0.8125rem] md:col-span-3">
              <input type="checkbox" name="carteiraRestrita" /> Ver só a própria carteira
            </label>
            <div className="flex items-end md:col-span-2 md:justify-end">
              <Botao>Adicionar usuário</Botao>
            </div>
          </form>
        </Card>
      )}

      <h2 id="funil" className="mb-3 mt-8 text-lg font-semibold">
        Funil do CRM
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fases.map((f) => (
          <Card
            key={f.id}
            titulo={f.nome}
            acoes={
              admin && (
                <form action={excluirFase}>
                  <input type="hidden" name="id" value={f.id} />
                  <BotaoConfirmar mensagem={`Excluir a fase "${f.nome}"? Os processos ficarão sem etapa.`} variante="fantasma" className="px-2 py-1 text-xs text-destructive">
                    Excluir
                  </BotaoConfirmar>
                </form>
              )
            }
          >
            <ul className="mb-3 space-y-1 text-sm">
              {f.etapas.map((et) => (
                <li key={et.id} className="flex items-center justify-between rounded bg-muted/50 px-2 py-1">
                  <span>
                    {et.nome} <span className="text-xs text-muted-foreground">({et._count.processos})</span>
                  </span>
                  {admin && (
                    <form action={excluirEtapa}>
                      <input type="hidden" name="id" value={et.id} />
                      <button className="text-muted-foreground hover:text-destructive" title="Excluir etapa">
                        <X size={14} />
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            {admin && (
              <form action={criarEtapa} className="flex gap-2">
                <input type="hidden" name="faseId" value={f.id} />
                <Entrada name="nome" required placeholder="Nova etapa" />
                <Botao variante="secundario">+</Botao>
              </form>
            )}
          </Card>
        ))}
        {admin && (
          <Card titulo="Nova fase">
            <form action={criarFase} className="flex gap-2">
              <Entrada name="nome" required placeholder="Ex.: Pós-venda" />
              <Botao variante="secundario">Criar</Botao>
            </form>
          </Card>
        )}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Categorias financeiras</h2>
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          {categorias.map((c) => (
            <span key={c.id} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm ${c.tipo === "RECEITA" ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive"}`}>
              {c.nome}
              {admin && (
                <form action={excluirCategoria} className="inline">
                  <input type="hidden" name="id" value={c.id} />
                  <button title="Excluir" className="opacity-60 hover:opacity-100">
                    <X size={12} />
                  </button>
                </form>
              )}
            </span>
          ))}
        </div>
        <form action={salvarCategoria} className="flex flex-wrap gap-2">
          <Entrada name="nome" required placeholder="Nova categoria" className="max-w-xs" />
          <Selecao name="tipo" opcoes={[["RECEITA", "Receita"], ["DESPESA", "Despesa"]]} className="max-w-40" />
          <Botao variante="secundario">Adicionar</Botao>
        </form>
      </Card>
    </>
  );
}
