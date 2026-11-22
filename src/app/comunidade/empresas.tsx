"use client";

import { useRef, useState } from "react";
import {
  ANEXOS, calcularMei, custoFuncionario, lerData, lerValor, moeda, pct, PARAMETROS, REGIMES, simularSimples, tributoEmAtraso, valorPorExtenso,
  type Anexo, type AtividadeMei, type Regime,
} from "@/lib/comunidade";
import { BotaoCopiar, BotaoOuvir, EntradaC, Ferramenta, Grupo, Linhas, Opcao, PainelResultado, SelecaoC, ValorC } from "./ui";

const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const ANO = PARAMETROS.ano;
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// ---------------------------------------------------------------- MEI

const SITUACAO_MEI = {
  ok: "Dentro do limite, com folga.",
  atencao: "Atenção: você já usou mais de 80% do limite do ano. Planeje as próximas vendas.",
  excesso_ate_20: "Você passou do limite em até 20%. Pague o DAS complementar sobre o excesso e, a partir de janeiro, a empresa passa a ser Microempresa (ME) no Simples Nacional. Procure um contador.",
  excesso_acima_20: "Você passou do limite em mais de 20%. O desenquadramento do MEI é retroativo a janeiro (ou à abertura) e os impostos serão recalculados. Procure um contador com urgência.",
};

export function Mei() {
  const [atividade, setAtividade] = useState<string>("servicos");
  const [faturado, setFaturado] = useState("");
  const [abriuEsteAno, setAbriuEsteAno] = useState("nao");
  const [mes, setMes] = useState("1");
  const [res, setRes] = useState<ReturnType<typeof calcularMei> | null>(null);

  return (
    <Ferramenta
      id="mei"
      titulo="DAS e limite do MEI"
      descricao={`Veja o valor do boleto mensal (DAS) em ${ANO} e quanto você ainda pode faturar no ano sem perder o MEI.`}
      aoEnviar={() => {
        const f = faturado.trim() ? lerValor(faturado) : 0;
        if (!(f >= 0)) return "Informe o faturamento do ano em reais (ou deixe em branco).";
        setRes(calcularMei({ atividade: atividade as AtividadeMei, faturadoNoAno: f, mesAbertura: abriuEsteAno === "sim" ? Number(mes) : undefined }));
      }}
      base={`Base: Lei Complementar 123/2006, art. 18-A. DAS = 5% do salário mínimo (INSS) + R$ 1 de ICMS (comércio e indústria) e/ou R$ 5 de ISS (serviços). Limite de R$ ${PARAMETROS.mei.limiteAnual.toLocaleString("pt-BR")} por ano, proporcional aos meses de atividade no ano da abertura.`}
      resultado={
        res && (
          <PainelResultado titulo={`DAS mensal em ${ANO}`} destaque={moeda(res.das)} aviso={SITUACAO_MEI[res.situacao]}>
            <Linhas
              itens={[
                { rotulo: "INSS (5% do salário mínimo)", valor: moeda(res.inss) },
                { rotulo: "ICMS", valor: moeda(res.icms) },
                { rotulo: "ISS", valor: moeda(res.iss) },
                { rotulo: "Seu limite de faturamento no ano", valor: moeda(res.limite), forte: true },
                { rotulo: "Já utilizado", valor: pct(res.uso, 1) },
                { rotulo: "Ainda pode faturar", valor: moeda(res.restante), forte: true },
              ]}
            />
            <div className="mt-4" aria-hidden>
              <div className="h-2.5 overflow-hidden rounded-full bg-camisa/15">
                <div className={`h-full rounded-full ${res.uso > 1 ? "bg-red-400" : res.uso > 0.8 ? "bg-amber-300" : "bg-emerald-400"}`} style={{ width: `${Math.min(100, res.uso * 100)}%` }} />
              </div>
            </div>
          </PainelResultado>
        )
      }
    >
      <SelecaoC
        rotulo="O que você vende?"
        value={atividade}
        onChange={(e) => setAtividade(e.target.value)}
        opcoes={[["servicos", "Serviços"], ["comercio", "Produtos (comércio ou indústria)"], ["ambos", "Produtos e serviços"]]}
      />
      <ValorC rotulo={`Quanto você já faturou em ${ANO} (R$)`} dica="Soma de tudo o que vendeu no ano, com ou sem nota." valor={faturado} setValor={setFaturado} obrigatorio={false} />
      <Grupo legenda={`O MEI foi aberto em ${ANO}?`}>
        <Opcao nome="abertura" valor="nao" atual={abriuEsteAno} setAtual={setAbriuEsteAno}>
          Não, já existia antes
        </Opcao>
        <Opcao nome="abertura" valor="sim" atual={abriuEsteAno} setAtual={setAbriuEsteAno}>
          Sim, abri neste ano
        </Opcao>
      </Grupo>
      {abriuEsteAno === "sim" && (
        <SelecaoC rotulo="Mês de abertura" value={mes} onChange={(e) => setMes(e.target.value)} opcoes={MESES.map((m, i) => [String(i + 1), m[0].toUpperCase() + m.slice(1)])} />
      )}
    </Ferramenta>
  );
}

// ---------------------------------------------------------------- Simples Nacional

export function Simples() {
  const [anexo, setAnexo] = useState<string>("I");
  const [rbt12, setRbt12] = useState("");
  const [mes, setMes] = useState("");
  const [folha, setFolha] = useState("");
  const [res, setRes] = useState<ReturnType<typeof simularSimples> | null>(null);

  return (
    <Ferramenta
      id="simples"
      titulo="Simples Nacional"
      descricao="Calcule a alíquota efetiva e o valor aproximado do DAS da sua empresa no Simples Nacional."
      aoEnviar={() => {
        const r = rbt12.trim() ? lerValor(rbt12) : 0, m = lerValor(mes);
        if (!(r >= 0)) return "Informe a receita bruta dos últimos 12 meses.";
        if (!(m > 0)) return "Informe o faturamento do mês.";
        const f = anexo === "V" && folha.trim() ? lerValor(folha) : undefined;
        setRes(simularSimples({ anexo: anexo as Anexo, rbt12: r, faturamentoMes: m, folha12: f }));
      }}
      base="Base: Lei Complementar 123/2006, Anexos I a V. Alíquota efetiva = (receita de 12 meses × alíquota nominal − parcela a deduzir) ÷ receita de 12 meses."
      resultado={
        res &&
        (res.foraDoLimite ? (
          <PainelResultado titulo="Resultado" destaque="Acima do limite" aviso="Com receita acima de R$ 4,8 milhões em 12 meses, a empresa não pode ficar no Simples Nacional. Procure um contador." />
        ) : (
          <PainelResultado titulo="DAS estimado do mês" destaque={moeda(res.das)} aviso="Estimativa. Substituição tributária, ISS retido e exportações podem reduzir o valor. Confirme no PGDAS-D ou com seu contador.">
            <Linhas
              itens={[
                { rotulo: "Anexo aplicado", valor: res.anexoAplicado, detalhe: res.fatorR !== undefined ? `Fator R: ${pct(res.fatorR, 1)} ${res.fatorR >= 0.28 ? "(≥ 28%: tributa pelo Anexo III)" : "(< 28%: continua no Anexo V)"}` : undefined },
                { rotulo: "Faixa", valor: `${res.faixa}ª` },
                { rotulo: "Alíquota nominal", valor: pct(res.nominal) },
                { rotulo: "Alíquota efetiva", valor: pct(res.efetiva), forte: true },
              ]}
            />
          </PainelResultado>
        ))
      }
    >
      <SelecaoC rotulo="Atividade (anexo)" value={anexo} onChange={(e) => setAnexo(e.target.value)} opcoes={(Object.keys(ANEXOS) as Anexo[]).map((k) => [k, ANEXOS[k].nome])} />
      <ValorC rotulo="Receita bruta dos últimos 12 meses (R$)" dica="Se a empresa é nova, deixe em branco: usamos a alíquota da 1ª faixa." valor={rbt12} setValor={setRbt12} obrigatorio={false} />
      <ValorC rotulo="Faturamento do mês (R$)" valor={mes} setValor={setMes} />
      {anexo === "V" && <ValorC rotulo="Folha de salários dos últimos 12 meses (R$)" dica="Inclui pró-labore e encargos. Serve para o Fator R." valor={folha} setValor={setFolha} obrigatorio={false} />}
    </Ferramenta>
  );
}

// ---------------------------------------------------------------- Custo de funcionário

export function Funcionario() {
  const [salario, setSalario] = useState(String(PARAMETROS.salarioMinimo).replace(".", ","));
  const [regime, setRegime] = useState<string>("mei");
  const [benef, setBenef] = useState("");
  const [res, setRes] = useState<ReturnType<typeof custoFuncionario> | null>(null);

  return (
    <Ferramenta
      id="funcionario"
      titulo="Custo de um funcionário"
      descricao="Descubra quanto custa por mês contratar uma pessoa com carteira assinada, somando 13º, férias e encargos."
      aoEnviar={() => {
        const s = lerValor(salario);
        if (!(s > 0)) return "Informe o salário.";
        setRes(custoFuncionario({ salario: s, regime: regime as Regime, beneficios: benef.trim() ? lerValor(benef) || 0 : 0 }));
      }}
      base="O MEI pode ter apenas 1 empregado, que receba o salário mínimo ou o piso da categoria (LC 123/2006, art. 18-C). Encargos de Lucro Presumido/Real com RAT médio de 2% e terceiros de 5,8%."
      resultado={
        res && (
          <PainelResultado
            titulo="Custo mensal estimado"
            destaque={moeda(res.mensal)}
            aviso={`O funcionário custa cerca de ${res.multiplicador.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} vezes o salário. Custo anual: ${moeda(res.anual)}.`}
          >
            <Linhas itens={[...res.itens.map((i) => ({ rotulo: i.rotulo, valor: moeda(i.valor) })), { rotulo: "Total por mês", valor: moeda(res.mensal), forte: true }]} />
          </PainelResultado>
        )
      }
    >
      <ValorC rotulo="Salário bruto (R$)" valor={salario} setValor={setSalario} />
      <SelecaoC rotulo="Regime da empresa" value={regime} onChange={(e) => setRegime(e.target.value)} opcoes={Object.entries(REGIMES) as [string, string][]} />
      <ValorC rotulo="Benefícios por mês (opcional)" dica="Parte paga pela empresa de vale-transporte, alimentação, plano de saúde." valor={benef} setValor={setBenef} obrigatorio={false} />
    </Ferramenta>
  );
}

// ---------------------------------------------------------------- Tributo federal em atraso

export function Tributo() {
  const [valor, setValor] = useState("");
  const [venc, setVenc] = useState("");
  const [pag, setPag] = useState(hoje());
  const [selic, setSelic] = useState("");
  const [res, setRes] = useState<ReturnType<typeof tributoEmAtraso> | null>(null);

  return (
    <Ferramenta
      id="tributo"
      titulo="Imposto federal em atraso"
      descricao="Calcule a multa e os juros para pagar um DARF ou DAS vencido."
      aoEnviar={() => {
        const v = lerValor(valor), a = lerData(venc), b = lerData(pag);
        if (!(v > 0)) return "Informe o valor do imposto.";
        if (!a || !b) return "Informe o vencimento e a data do pagamento.";
        if (b < a) return "A data de pagamento não pode ser antes do vencimento.";
        const s = selic.trim() ? lerValor(selic) : 0;
        if (!(s >= 0)) return "Informe a Selic acumulada em porcentagem (ou 0).";
        setRes(tributoEmAtraso({ valor: v, vencimento: a, pagamento: b, selicAcumuladaPct: s }));
      }}
      base={
        <>
          Base: Lei 9.430/1996, art. 61. Multa de 0,33% por dia de atraso, limitada a 20%, e juros pela Selic acumulada desde o mês seguinte ao vencimento + 1% no mês do pagamento. A Selic acumulada é publicada no{" "}
          <a className="underline" href="https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/pagamentos-e-parcelamentos/taxa-de-juros-selic" target="_blank" rel="noreferrer">site da Receita Federal</a>. Para o DAS do MEI, gere a guia atualizada no Portal do Empreendedor.
        </>
      }
      resultado={
        res && (
          <PainelResultado titulo="Valor total a pagar" destaque={moeda(res.total)} aviso="Os sistemas da Receita (Sicalc e PGMEI) calculam o valor oficial. Use esta conta para conferir e se planejar.">
            <Linhas
              itens={[
                { rotulo: "Valor principal", valor: moeda(lerValor(valor)) },
                { rotulo: "Dias em atraso", valor: String(res.dias) },
                { rotulo: `Multa de mora (${pct(res.multaPct)})`, valor: moeda(res.multa) },
                { rotulo: `Juros (${pct(res.jurosPct)})`, valor: moeda(res.juros) },
                { rotulo: "Total", valor: moeda(res.total), forte: true },
              ]}
            />
          </PainelResultado>
        )
      }
    >
      <ValorC rotulo="Valor do imposto (R$)" valor={valor} setValor={setValor} />
      <div className="grid gap-4 sm:grid-cols-2">
        <EntradaC rotulo="Vencimento" type="date" value={venc} onChange={(e) => setVenc(e.target.value)} />
        <EntradaC rotulo="Data do pagamento" type="date" value={pag} onChange={(e) => setPag(e.target.value)} />
      </div>
      <ValorC rotulo="Selic acumulada no período (%)" dica="Do mês seguinte ao vencimento até o mês anterior ao pagamento." valor={selic} setValor={setSelic} obrigatorio={false} />
    </Ferramenta>
  );
}

// ---------------------------------------------------------------- Recibo

export function Recibo() {
  const [recebedor, setRecebedor] = useState("");
  const [doc, setDoc] = useState("");
  const [pagador, setPagador] = useState("");
  const [valor, setValor] = useState("");
  const [referente, setReferente] = useState("");
  const [cidade, setCidade] = useState("");
  const [data, setData] = useState(hoje());
  const [texto, setTexto] = useState("");
  const ref = useRef<HTMLPreElement>(null);

  return (
    <Ferramenta
      id="recibo"
      titulo="Gerador de recibo"
      descricao="Gere um recibo simples, com o valor por extenso, para imprimir ou enviar."
      botao="Gerar recibo"
      aoEnviar={() => {
        const v = lerValor(valor);
        if (!recebedor.trim() || !pagador.trim()) return "Informe quem recebeu e quem pagou.";
        if (!(v > 0)) return "Informe o valor recebido.";
        if (!referente.trim()) return "Informe a que se refere o pagamento.";
        const d = lerData(data) ?? new Date();
        setTexto(
          `RECIBO  ·  ${moeda(v)}\n\n` +
            `Recebi de ${pagador.trim()} a importância de ${moeda(v)} (${valorPorExtenso(v)}), referente a ${referente.trim()}.\n\n` +
            `Para maior clareza, firmo o presente recibo, dando plena e geral quitação do valor acima.\n\n` +
            `${cidade.trim() ? cidade.trim() + ", " : ""}${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}.\n\n\n` +
            `______________________________\n${recebedor.trim()}${doc.trim() ? `\nCPF/CNPJ: ${doc.trim()}` : ""}`,
        );
      }}
      resultado={
        texto && (
          <div className="painel-resultado rounded-xl bg-noite p-6 text-camisa">
            <p className="text-sm text-camisa/70">Recibo gerado</p>
            <pre ref={ref} id="recibo-impressao" className="mt-3 rounded-lg bg-white p-5 font-sans text-base leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] text-black">
              {texto}
            </pre>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-current/25 px-2.5 py-1 text-sm font-medium hover:bg-current/10"
                onClick={() => {
                  const w = window.open("", "_blank", "width=800,height=600");
                  if (!w) return;
                  const pre = w.document.createElement("pre");
                  pre.textContent = texto;
                  pre.style.cssText = "font:16px/1.7 system-ui,sans-serif;white-space:pre-wrap;padding:48px;max-width:680px";
                  w.document.title = "Recibo";
                  w.document.body.appendChild(pre);
                  w.print();
                }}
              >
                Imprimir
              </button>
              <BotaoCopiar texto={() => texto} />
              <BotaoOuvir alvo={() => ref.current} rotulo="Ouvir recibo" />
            </div>
          </div>
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <EntradaC rotulo="Quem recebeu (seu nome ou empresa)" value={recebedor} onChange={(e) => setRecebedor(e.target.value)} />
        <EntradaC rotulo="CPF ou CNPJ (opcional)" inputMode="numeric" value={doc} onChange={(e) => setDoc(e.target.value)} />
      </div>
      <EntradaC rotulo="Quem pagou" value={pagador} onChange={(e) => setPagador(e.target.value)} />
      <ValorC rotulo="Valor recebido (R$)" valor={valor} setValor={setValor} />
      <EntradaC rotulo="Referente a" placeholder="Ex.: conserto de ar-condicionado" value={referente} onChange={(e) => setReferente(e.target.value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <EntradaC rotulo="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
        <EntradaC rotulo="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
    </Ferramenta>
  );
}

// ---------------------------------------------------------------- Checklist MEI

const CHECKLIST: [string, string[]][] = [
  ["Para abrir", [
    "Ter conta gov.br nível prata ou ouro.",
    "Confirmar que a sua atividade é permitida para MEI.",
    "Não ser sócio, administrador ou titular de outra empresa.",
    "Fazer a formalização gratuita no Portal do Empreendedor (gov.br/mei). Desconfie de sites que cobram.",
    "Verificar na prefeitura se o endereço permite a atividade (alvará).",
  ]],
  ["Para manter em dia", [
    "Pagar o DAS todo mês, até o dia 20.",
    "Emitir nota fiscal para vendas a empresas (para pessoa física, é opcional).",
    "Guardar as notas de compra e anotar o faturamento todo mês (relatório mensal de receitas).",
    "Entregar a declaração anual (DASN-SIMEI) até 31 de maio.",
    "Acompanhar o limite de faturamento do ano.",
    "Se contratar um funcionário, registrar no eSocial e recolher o FGTS e os 3% de INSS.",
  ]],
  ["Para encerrar", [
    "Pagar ou parcelar os DAS em atraso (as dívidas continuam no seu CPF).",
    "Fazer a baixa no Portal do Empreendedor.",
    "Entregar a declaração de extinção (DASN-SIMEI de extinção).",
  ]],
];

export function ChecklistMei() {
  const [feitos, setFeitos] = useState<Record<string, boolean>>({});
  const total = CHECKLIST.reduce((s, [, l]) => s + l.length, 0);
  const n = Object.values(feitos).filter(Boolean).length;
  const ref = useRef<HTMLDivElement>(null);
  return (
    <section aria-labelledby="titulo-checklist-mei">
      <h2 id="titulo-checklist-mei" tabIndex={-1} data-titulo-ferramenta className="font-heading text-2xl font-semibold tracking-tight outline-none">
        Checklist do MEI
      </h2>
      <p className="mt-1.5 text-base text-muted-foreground">Marque o que você já fez. Nada é enviado nem salvo: a lista fica só na sua tela.</p>
      <p role="status" className="mt-3 text-base font-medium">
        {n} de {total} itens concluídos
      </p>
      <div ref={ref} className="mt-5 grid gap-4 lg:grid-cols-3">
        {CHECKLIST.map(([grupo, itens]) => (
          <fieldset key={grupo} className="rounded-xl border bg-card p-4">
            <legend className="px-1 text-lg font-semibold">{grupo}</legend>
            <ul className="mt-1 grid gap-2.5">
              {itens.map((i) => (
                <li key={i}>
                  <label className="flex items-start gap-2.5 text-base">
                    <input type="checkbox" className="mt-1" checked={!!feitos[i]} onChange={(e) => setFeitos({ ...feitos, [i]: e.target.checked })} />
                    <span>{i}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </div>
      <BotaoOuvir alvo={() => ref.current} rotulo="Ouvir checklist" className="mt-4" />
    </section>
  );
}
