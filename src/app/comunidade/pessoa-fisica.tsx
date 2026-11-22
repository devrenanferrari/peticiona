"use client";

import { useMemo, useRef, useState } from "react";
import {
  atualizarDivida, calcularRescisao, lerData, lerValor, moeda, pct, PARAMETROS, simularIRMensal, simularPensao, type MotivoRescisao,
} from "@/lib/comunidade";
import { BotaoCopiar, BotaoOuvir, EntradaC, Ferramenta, Grupo, Linhas, Opcao, PainelResultado, SelecaoC, ValorC } from "./ui";

const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const ANO = PARAMETROS.ano;

// ---------------------------------------------------------------- Rescisão

const MOTIVOS: [MotivoRescisao, string][] = [
  ["sem_justa_causa", "Fui demitido(a) sem justa causa"],
  ["pedido_demissao", "Pedi demissão"],
  ["acordo", "Saída por acordo com a empresa (CLT, art. 484-A)"],
  ["justa_causa", "Fui demitido(a) por justa causa"],
];

export function Rescisao() {
  const [salario, setSalario] = useState("");
  const [admissao, setAdmissao] = useState("");
  const [saida, setSaida] = useState(hoje());
  const [motivo, setMotivo] = useState<string>("sem_justa_causa");
  const [aviso, setAviso] = useState("indenizado");
  const [vencidas, setVencidas] = useState("0");
  const [fgts, setFgts] = useState("");
  const [res, setRes] = useState<ReturnType<typeof calcularRescisao> | null>(null);

  return (
    <Ferramenta
      id="rescisao"
      titulo="Rescisão trabalhista"
      descricao="Estime quanto você tem a receber ao sair do emprego com carteira assinada."
      aoEnviar={() => {
        const s = lerValor(salario), a = lerData(admissao), d = lerData(saida);
        if (!(s > 0)) return "Informe o seu último salário bruto (o valor antes dos descontos).";
        if (!a || !d) return "Informe as datas de admissão e de saída.";
        if (d <= a) return "A data de saída precisa ser depois da data de admissão.";
        const f = fgts.trim() ? lerValor(fgts) : undefined;
        setRes(calcularRescisao({ salario: s, admissao: a, saida: d, motivo: motivo as MotivoRescisao, avisoIndenizado: aviso === "indenizado", feriasVencidas: Number(vencidas), saldoFgts: f }));
      }}
      base="Base: CLT (arts. 477, 484-A e 487), Lei 12.506/2011 (aviso proporcional) e Lei 8.036/1990 (FGTS). Valores brutos, antes do INSS e do Imposto de Renda."
      resultado={
        res && (
          <PainelResultado
            titulo="Total estimado a receber na rescisão"
            destaque={moeda(res.total)}
            aviso="Estimativa. Convenções coletivas, horas extras, comissões e adicionais podem mudar os valores. Confira o termo de rescisão (TRCT) e, se houver diferença, procure orientação."
          >
            <Linhas itens={[...res.itens.map((i) => ({ rotulo: i.rotulo, valor: moeda(i.valor), detalhe: i.detalhe })), { rotulo: "Total", valor: moeda(res.total), forte: true }]} />
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-camisa/80">
              <li>Saque do FGTS: {res.saqueFgts}{res.fgtsEstimado ? ` (saldo estimado em ${moeda(res.fgts)}; confira no app FGTS)` : ""}.</li>
              <li>{res.seguroDesemprego ? "Você pode ter direito ao seguro-desemprego: peça pela Carteira de Trabalho Digital." : "Nesta situação não há direito ao seguro-desemprego."}</li>
              <li>A empresa tem 10 dias corridos após a saída para pagar a rescisão (CLT, art. 477, §6º).</li>
            </ul>
          </PainelResultado>
        )
      }
    >
      <ValorC rotulo="Último salário bruto (R$)" valor={salario} setValor={setSalario} />
      <div className="grid gap-4 sm:grid-cols-2">
        <EntradaC rotulo="Data de admissão" type="date" value={admissao} onChange={(e) => setAdmissao(e.target.value)} />
        <EntradaC rotulo="Data de saída (último dia)" type="date" value={saida} onChange={(e) => setSaida(e.target.value)} />
      </div>
      <Grupo legenda="Como foi a saída?">
        {MOTIVOS.map(([v, r]) => (
          <Opcao key={v} nome="motivo" valor={v} atual={motivo} setAtual={setMotivo}>
            {r}
          </Opcao>
        ))}
      </Grupo>
      {(motivo === "sem_justa_causa" || motivo === "acordo") && (
        <SelecaoC rotulo="Aviso prévio" value={aviso} onChange={(e) => setAviso(e.target.value)} opcoes={[["indenizado", "Indenizado (a empresa pagou e eu não trabalhei)"], ["trabalhado", "Trabalhado (cumpri o aviso)"]]} />
      )}
      <SelecaoC rotulo="Férias vencidas que você ainda não tirou" value={vencidas} onChange={(e) => setVencidas(e.target.value)} opcoes={[["0", "Nenhuma"], ["1", "1 período"], ["2", "2 períodos"]]} />
      <ValorC rotulo="Saldo do FGTS (opcional)" dica="Se deixar em branco, estimamos pelo salário e pelo tempo de trabalho." valor={fgts} setValor={setFgts} obrigatorio={false} />
    </Ferramenta>
  );
}

// ---------------------------------------------------------------- IRPF

export function Irpf() {
  const [bruto, setBruto] = useState("");
  const [dep, setDep] = useState("0");
  const [pensao, setPensao] = useState("");
  const [res, setRes] = useState<ReturnType<typeof simularIRMensal> | null>(null);

  return (
    <Ferramenta
      id="irpf"
      titulo="Imposto de Renda no salário"
      descricao={`Veja quanto de INSS e de Imposto de Renda é descontado do seu salário em ${ANO}, já com a isenção para quem ganha até R$ 5.000.`}
      aoEnviar={() => {
        const b = lerValor(bruto);
        if (!(b > 0)) return "Informe o salário bruto mensal.";
        const n = Number(dep);
        if (!Number.isInteger(n) || n < 0 || n > 20) return "Informe o número de dependentes (0 a 20).";
        setRes(simularIRMensal({ bruto: b, dependentes: n, pensao: pensao.trim() ? lerValor(pensao) || 0 : 0 }));
      }}
      base={`Base: tabela mensal do IRRF e redução da Lei 15.270/2025, tabela de contribuição do INSS de ${ANO}. Não considera outros descontos, como plano de saúde ou previdência privada.`}
      resultado={
        res && (
          <PainelResultado
            titulo="Imposto de Renda descontado por mês"
            destaque={res.imposto === 0 ? "Isento · R$ 0,00" : moeda(res.imposto)}
            aviso="Simulação do desconto mensal na folha. A declaração anual pode resultar em restituição ou imposto a pagar."
          >
            <Linhas
              itens={[
                { rotulo: "INSS descontado", valor: moeda(res.inss) },
                { rotulo: res.usaSimplificado ? "Desconto simplificado" : "Deduções (INSS, dependentes e pensão)", valor: moeda(res.deducoes) },
                { rotulo: "Base de cálculo", valor: moeda(res.base) },
                { rotulo: `Imposto pela tabela (${pct(res.aliquota, 1)})`, valor: moeda(res.impostoTabela) },
                { rotulo: "Redução (Lei 15.270/2025)", valor: `− ${moeda(res.reducao)}` },
                { rotulo: "Imposto a pagar", valor: moeda(res.imposto), forte: true },
                { rotulo: "Alíquota efetiva", valor: pct(res.aliquotaEfetiva) },
                { rotulo: "Salário líquido estimado", valor: moeda(res.liquido), forte: true },
              ]}
            />
          </PainelResultado>
        )
      }
    >
      <ValorC rotulo="Salário bruto mensal (R$)" valor={bruto} setValor={setBruto} />
      <EntradaC rotulo="Número de dependentes" type="number" min={0} max={20} value={dep} onChange={(e) => setDep(e.target.value)} />
      <ValorC rotulo="Pensão alimentícia que você paga por decisão judicial (opcional)" valor={pensao} setValor={setPensao} obrigatorio={false} />
    </Ferramenta>
  );
}

// ---------------------------------------------------------------- Dívida

export function Divida() {
  const [valor, setValor] = useState("");
  const [venc, setVenc] = useState("");
  const [pag, setPag] = useState(hoje());
  const [multa, setMulta] = useState("2");
  const [juros, setJuros] = useState("1");
  const [corr, setCorr] = useState("");
  const [res, setRes] = useState<ReturnType<typeof atualizarDivida> | null>(null);

  return (
    <Ferramenta
      id="divida"
      titulo="Juros e multa de dívida"
      descricao="Atualize uma conta ou dívida em atraso e confira se a cobrança está correta."
      aoEnviar={() => {
        const v = lerValor(valor), a = lerData(venc), b = lerData(pag);
        if (!(v > 0)) return "Informe o valor original da dívida.";
        if (!a || !b) return "Informe a data de vencimento e a data de pagamento.";
        if (b < a) return "A data de pagamento não pode ser antes do vencimento.";
        const m = lerValor(multa), j = lerValor(juros);
        if (!(m >= 0) || !(j >= 0)) return "Informe a multa e os juros (use 0 se não houver).";
        setRes(atualizarDivida({ valor: v, vencimento: a, pagamento: b, multaPct: m, jurosMesPct: j, correcaoPct: corr.trim() ? lerValor(corr) || 0 : 0 }));
      }}
      base="Em compras e serviços de consumo, a multa por atraso não pode passar de 2% (Código de Defesa do Consumidor, art. 52, §1º). Os juros mais comuns em contratos são de 1% ao mês; confira o que está no seu contrato."
      resultado={
        res && (
          <PainelResultado titulo="Valor atualizado para pagamento" destaque={moeda(res.total)} aviso={Number(lerValor(multa)) > 2 ? "Atenção: em relações de consumo a multa máxima é de 2%. Uma multa maior pode ser contestada no Procon." : undefined}>
            <Linhas
              itens={[
                { rotulo: "Valor original", valor: moeda(lerValor(valor)) },
                { rotulo: "Dias em atraso", valor: String(res.dias) },
                { rotulo: "Correção monetária", valor: moeda(res.correcao) },
                { rotulo: "Multa", valor: moeda(res.multa) },
                { rotulo: "Juros", valor: moeda(res.juros) },
                { rotulo: "Total", valor: moeda(res.total), forte: true },
              ]}
            />
          </PainelResultado>
        )
      }
    >
      <ValorC rotulo="Valor original (R$)" valor={valor} setValor={setValor} />
      <div className="grid gap-4 sm:grid-cols-2">
        <EntradaC rotulo="Data de vencimento" type="date" value={venc} onChange={(e) => setVenc(e.target.value)} />
        <EntradaC rotulo="Data do pagamento" type="date" value={pag} onChange={(e) => setPag(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <ValorC rotulo="Multa (%)" valor={multa} setValor={setMulta} />
        <ValorC rotulo="Juros ao mês (%)" valor={juros} setValor={setJuros} />
        <ValorC rotulo="Correção (%)" dica="Opcional: índice do período" valor={corr} setValor={setCorr} obrigatorio={false} />
      </div>
    </Ferramenta>
  );
}

// ---------------------------------------------------------------- Pensão

export function Pensao() {
  const [renda, setRenda] = useState("");
  const [semVinculo, setSemVinculo] = useState("nao");
  const [perc, setPerc] = useState("30");
  const [res, setRes] = useState<ReturnType<typeof simularPensao> | null>(null);

  return (
    <Ferramenta
      id="pensao"
      titulo="Pensão alimentícia"
      descricao="Simule o valor da pensão a partir de um percentual. O valor final é sempre decidido pelo juiz ou por acordo homologado."
      aoEnviar={() => {
        const p = lerValor(perc);
        if (!(p > 0 && p <= 100)) return "Informe um percentual entre 1 e 100.";
        const sv = semVinculo === "sim";
        const r = sv ? 0 : lerValor(renda);
        if (!sv && !(r > 0)) return "Informe a renda líquida de quem vai pagar a pensão.";
        setRes(simularPensao({ renda: r, percentual: p, semVinculo: sv }));
      }}
      base="A pensão segue o equilíbrio entre a necessidade de quem recebe e a possibilidade de quem paga (Código Civil, art. 1.694, §1º). Não existe percentual fixo em lei."
      resultado={
        res && (
          <PainelResultado titulo="Valor mensal simulado" destaque={moeda(res.mensal)} aviso="Simulação. Despesas extras (escola, saúde) podem ser divididas à parte. Quem não tem condições de pagar advogado pode procurar a Defensoria Pública.">
            <Linhas
              itens={[
                { rotulo: semVinculo === "sim" ? "Base: salário mínimo" : "Base: renda líquida", valor: moeda(res.base) },
                { rotulo: "Percentual", valor: `${perc}%` },
                { rotulo: semVinculo === "sim" ? "Total no ano (12 meses)" : "Total no ano (com 13º)", valor: moeda(res.anual), forte: true },
              ]}
            />
          </PainelResultado>
        )
      }
    >
      <Grupo legenda="Quem vai pagar tem emprego com carteira ou renda fixa?">
        <Opcao nome="vinculo" valor="nao" atual={semVinculo} setAtual={setSemVinculo}>
          Sim, tem renda comprovada
        </Opcao>
        <Opcao nome="vinculo" valor="sim" atual={semVinculo} setAtual={setSemVinculo}>
          Não (autônomo ou desempregado): usar o salário mínimo como base
        </Opcao>
      </Grupo>
      {semVinculo === "nao" && <ValorC rotulo="Renda líquida mensal de quem paga (R$)" dica="Salário depois do INSS e do Imposto de Renda." valor={renda} setValor={setRenda} />}
      <EntradaC rotulo="Percentual (%)" dica="Na prática, costuma ficar entre 15% e 33%, conforme o número de filhos e as necessidades." inputMode="decimal" value={perc} onChange={(e) => setPerc(e.target.value)} />
    </Ferramenta>
  );
}

// ---------------------------------------------------------------- Reclamação do consumidor

const PROBLEMAS: [string, string, string][] = [
  ["defeito", "Produto com defeito que não foi consertado", "Conforme o art. 18 do Código de Defesa do Consumidor, o fornecedor tem 30 dias para sanar o vício. Não o tendo feito, solicito, à minha escolha:"],
  ["arrependimento", "Compra pela internet ou telefone e me arrependi (até 7 dias)", "Conforme o art. 49 do Código de Defesa do Consumidor, exerço meu direito de arrependimento dentro do prazo de 7 dias a contar do recebimento, e solicito:"],
  ["oferta", "Não cumpriram o que foi anunciado (preço, prazo, brinde)", "Conforme os arts. 30 e 35 do Código de Defesa do Consumidor, a oferta obriga o fornecedor, razão pela qual solicito:"],
  ["cobranca", "Cobrança indevida ou valor cobrado a mais", "Conforme o art. 42, parágrafo único, do Código de Defesa do Consumidor, quem é cobrado indevidamente tem direito à devolução em dobro do que pagou a mais. Solicito:"],
  ["servico", "Serviço mal prestado ou não prestado", "Conforme o art. 20 do Código de Defesa do Consumidor, o fornecedor responde pelos vícios de qualidade do serviço. Solicito:"],
];
const PEDIDOS: Record<string, string> = {
  troca: "a substituição do produto por outro da mesma espécie, em perfeitas condições;",
  devolucao: "a devolução imediata da quantia paga, com correção monetária;",
  abatimento: "o abatimento proporcional do preço;",
  cancelamento: "o cancelamento do contrato/serviço, sem multa, e a devolução dos valores pagos;",
  cumprimento: "o cumprimento da oferta nos exatos termos anunciados;",
};

export function Consumidor() {
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [produto, setProduto] = useState("");
  const [data, setData] = useState("");
  const [problema, setProblema] = useState("defeito");
  const [pedido, setPedido] = useState("troca");
  const [relato, setRelato] = useState("");
  const [texto, setTexto] = useState("");
  const ref = useRef<HTMLPreElement>(null);

  return (
    <Ferramenta
      id="consumidor"
      titulo="Reclamação do consumidor"
      descricao="Preencha os dados e gere um texto de reclamação para enviar à empresa, ao Procon ou ao consumidor.gov.br."
      botao="Gerar reclamação"
      aoEnviar={() => {
        if (!nome.trim() || !empresa.trim() || !produto.trim()) return "Preencha seu nome, o nome da empresa e o produto ou serviço.";
        const [, , fundamento] = PROBLEMAS.find((p) => p[0] === problema)!;
        const quando = lerData(data)?.toLocaleDateString("pt-BR");
        setTexto(
          `À ${empresa.trim()}\n\nAssunto: Reclamação – ${produto.trim()}\n\n` +
            `Eu, ${nome.trim()}, consumidor(a), adquiri/contratei ${produto.trim()}${quando ? ` em ${quando}` : ""}.\n\n` +
            (relato.trim() ? `${relato.trim()}\n\n` : "") +
            `${fundamento}\n- ${PEDIDOS[pedido]}\n\n` +
            `Aguardo resposta no prazo de 10 (dez) dias. Não havendo solução, levarei a reclamação ao Procon e ao consumidor.gov.br, sem prejuízo das medidas judiciais cabíveis.\n\n` +
            `${new Date().toLocaleDateString("pt-BR")}\n\n${nome.trim()}`,
        );
      }}
      base={
        <>
          Envie por e-mail ou pelo SAC e guarde o número de protocolo. Se não resolverem, registre a reclamação em{" "}
          <a className="underline" href="https://www.consumidor.gov.br" target="_blank" rel="noreferrer">consumidor.gov.br</a> ou no Procon da sua cidade.
        </>
      }
      resultado={
        texto && (
          <div className="painel-resultado rounded-xl bg-noite p-6 text-camisa">
            <p className="text-sm text-camisa/70">Texto da reclamação</p>
            <pre ref={ref} className="mt-3 font-sans text-base leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{texto}</pre>
            <div className="mt-5 flex flex-wrap gap-2">
              <BotaoCopiar texto={() => texto} />
              <BotaoOuvir alvo={() => ref.current} rotulo="Ouvir texto" />
            </div>
          </div>
        )
      }
    >
      <EntradaC rotulo="Seu nome completo" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} />
      <EntradaC rotulo="Nome da empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <EntradaC rotulo="Produto ou serviço" placeholder="Ex.: geladeira modelo X" value={produto} onChange={(e) => setProduto(e.target.value)} />
        <EntradaC rotulo="Data da compra" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <SelecaoC rotulo="Qual é o problema?" value={problema} onChange={(e) => setProblema(e.target.value)} opcoes={PROBLEMAS.map(([v, r]) => [v, r])} />
      <SelecaoC
        rotulo="O que você quer?"
        value={pedido}
        onChange={(e) => setPedido(e.target.value)}
        opcoes={[["troca", "Troca do produto"], ["devolucao", "Dinheiro de volta"], ["abatimento", "Desconto no preço"], ["cancelamento", "Cancelar o contrato ou serviço"], ["cumprimento", "Que cumpram o que foi anunciado"]]}
      />
      <div className="grid gap-1.5">
        <label htmlFor="relato" className="text-base font-medium">
          Conte o que aconteceu (opcional)
        </label>
        <textarea id="relato" rows={4} value={relato} onChange={(e) => setRelato(e.target.value)} className="campo campo-comunidade" />
      </div>
    </Ferramenta>
  );
}

// ---------------------------------------------------------------- Glossário

const TERMOS: [string, string][] = [
  ["Ação", "Pedido feito à Justiça para resolver um conflito ou garantir um direito."],
  ["Audiência", "Encontro marcado pelo juiz com as partes para tentar um acordo, ouvir testemunhas ou decidir o processo."],
  ["Autor e réu", "Autor é quem entra com a ação; réu é a pessoa ou empresa contra quem a ação é proposta."],
  ["Citação", "Aviso oficial ao réu de que existe um processo contra ele, para que possa se defender."],
  ["Intimação", "Comunicação oficial sobre algo que aconteceu no processo, que muitas vezes abre um prazo para agir."],
  ["Prazo processual", "Tempo que a pessoa tem para praticar um ato no processo. Em regra, conta-se apenas em dias úteis."],
  ["Sentença", "Decisão do juiz que resolve o processo na primeira instância."],
  ["Recurso", "Pedido para que um tribunal reveja uma decisão com a qual a parte não concorda."],
  ["Trânsito em julgado", "Quando não cabe mais recurso e a decisão se torna definitiva."],
  ["Liminar", "Decisão rápida e provisória dada no início do processo, em casos urgentes."],
  ["Justiça gratuita", "Direito de quem não pode pagar as custas do processo sem prejudicar o próprio sustento."],
  ["Juizado Especial", "Justiça mais simples e rápida para causas menores. Até 20 salários mínimos não é preciso advogado."],
  ["Defensoria Pública", "Órgão público que presta assistência jurídica gratuita a quem não pode pagar um advogado."],
  ["Honorários", "Valor pago ao advogado pelo seu trabalho."],
  ["Acordo homologado", "Acordo entre as partes aprovado pelo juiz, que passa a ter a força de uma decisão judicial."],
  ["Execução", "Fase em que a Justiça obriga o devedor a cumprir o que foi decidido, como pagar uma dívida."],
  ["Procuração", "Documento em que a pessoa autoriza outra (como um advogado) a agir em seu nome."],
  ["Prescrição", "Perda do direito de cobrar ou reclamar na Justiça por ter passado o prazo previsto em lei."],
];

export function Glossario() {
  const [q, setQ] = useState("");
  const lista = useMemo(() => {
    const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return TERMOS.filter(([t, d]) => n(t + " " + d).includes(n(q)));
  }, [q]);
  return (
    <section aria-labelledby="titulo-glossario">
      <h2 id="titulo-glossario" tabIndex={-1} data-titulo-ferramenta className="font-heading text-2xl font-semibold tracking-tight outline-none">
        Glossário jurídico
      </h2>
      <p className="mt-1.5 text-base text-muted-foreground">Termos que aparecem em processos e documentos, explicados em linguagem simples.</p>
      <div className="mt-5 max-w-md">
        <EntradaC rotulo="Buscar termo" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p role="status" className="sr-only">{lista.length} termo(s) encontrado(s)</p>
      <dl className="mt-6 grid gap-3 md:grid-cols-2">
        {lista.map(([t, d]) => (
          <div key={t} className="rounded-xl border bg-card p-4">
            <dt className="text-base font-semibold">{t}</dt>
            <dd className="mt-1 text-base text-muted-foreground">{d}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
