"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const PERGUNTAS = [
  {
    p: "Como funciona o primeiro contato?",
    r: "Depois da sua mensagem, um advogado da equipe retorna em até um dia útil para entender o cenário e agendar uma reunião de diagnóstico, presencial em Belo Horizonte ou por vídeo.",
  },
  {
    p: "Vocês atendem empresas de fora de Minas Gerais?",
    r: "Sim. O escritório fica em Belo Horizonte e atende empresas de todo o Brasil. Reuniões, assinaturas e o acompanhamento das demandas podem ser feitos de forma digital.",
  },
  {
    p: "Como os honorários são definidos?",
    r: "Os honorários são apresentados em proposta formal após o diagnóstico, conforme a complexidade da demanda e o Código de Ética da OAB. Trabalhamos com projetos pontuais e com assessoria mensal.",
  },
  {
    p: "O que é a assessoria mensal?",
    r: "É o acompanhamento contínuo da empresa: revisão de contratos, consultas do dia a dia, planejamento tributário e apoio às decisões da gestão, com um advogado de referência.",
  },
  {
    p: "Como acompanho o andamento das demandas?",
    r: "Cada cliente recebe atualizações periódicas sobre processos, prazos e entregas, além de um canal direto com a equipe responsável.",
  },
];

export function Duvidas() {
  return (
    <Accordion type="single" collapsible className="border-t border-noite/10">
      {PERGUNTAS.map(({ p, r }, i) => (
        <AccordionItem key={p} value={`q${i}`} className="border-b border-noite/10">
          <AccordionTrigger className="py-6 text-left text-[1.1875rem] font-semibold tracking-[-0.015em] text-noite hover:no-underline md:text-[1.375rem] [&>svg]:size-5 [&>svg]:text-noite/40">
            {p}
          </AccordionTrigger>
          <AccordionContent className="max-w-[44rem] pb-7 text-[1.0625rem] leading-relaxed text-noite/65">{r}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
