import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, MessageCircle } from "lucide-react";
import { Monograma } from "@/components/monograma";
import { Abertura, Entrada } from "@/site/abertura";
import { Cabecalho } from "@/site/cabecalho";
import { EQUIPE, PRATICAS, SITE, SOCIOS } from "@/site/config";
import { Duvidas } from "@/site/duvidas";
import { FormularioContato } from "@/site/formulario";
import { Manifesto } from "@/site/manifesto";
import { Metodo } from "@/site/metodo";

export const metadata: Metadata = {
  title: { absolute: `${SITE.nomeCompleto} · ${SITE.slogan}` },
  description: `${SITE.slogan} em ${SITE.cidade.replace(" · ", "/")}. Planejamento individualizado, feito sob medida para o negócio de cada cliente.`,
  openGraph: { title: SITE.nomeCompleto, description: SITE.slogan, type: "website", locale: "pt_BR" },
};

const WHATSAPP = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent("Olá! Gostaria de falar com o escritório.")}`;

const conteiner = "mx-auto w-full max-w-[68rem] px-5 md:px-6";

function LinkSeta({ href, children, className, externo }: { href: string; children: React.ReactNode; className?: string; externo?: boolean }) {
  return (
    <a
      href={href}
      target={externo ? "_blank" : undefined}
      rel={externo ? "noreferrer" : undefined}
      className={`group inline-flex items-center gap-0.5 font-medium text-marca hover:underline ${className ?? ""}`}
    >
      {children}
      <ChevronRight className="size-[1.1em] transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.25} />
    </a>
  );
}

export default function Site() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    name: SITE.nomeCompleto,
    description: SITE.slogan,
    telephone: SITE.telefone,
    email: SITE.email,
    address: { "@type": "PostalAddress", addressLocality: "Belo Horizonte", addressRegion: "MG", addressCountry: "BR" },
    areaServed: "BR",
    sameAs: [SITE.instagram],
    founder: SOCIOS.map((s) => ({ "@type": "Person", name: s.nome })),
  };

  return (
    <div className="site bg-noite text-camisa">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Cabecalho />

      <main>
        {/* ============ ABERTURA ============ */}
        <Abertura>
          <Entrada>
            <h1 className="texto-display mx-auto max-w-[14ch] text-[clamp(3rem,8.4vw,6rem)]">Grandes decisões pedem estratégia.</h1>
          </Entrada>
          <Entrada ordem={1}>
            <p className="mx-auto mt-7 max-w-[36rem] text-[clamp(1.0625rem,1.6vw,1.3125rem)] leading-[1.45] text-camisa/65">
              Advocacia empresarial e tributária em Belo Horizonte, com planejamento individualizado, feito sob medida para o negócio de cada cliente.
            </p>
          </Entrada>
          <Entrada ordem={2} className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
            <a
              href="#contato"
              className="inline-flex h-12 items-center rounded-full bg-camisa px-7 text-[0.9375rem] font-medium text-noite transition-[background-color,transform] duration-200 hover:bg-white active:scale-[0.97]"
            >
              Fale com um sócio
            </a>
            <LinkSeta href={WHATSAPP} externo className="text-[1.0625rem]">
              Conversar no WhatsApp
            </LinkSeta>
          </Entrada>
        </Abertura>

        {/* ============ MANIFESTO ============ */}
        <section className="bg-noite py-[clamp(7rem,18vh,12rem)]">
          <div className={`${conteiner} max-w-[56rem]`}>
            <Manifesto
              texto="Nenhuma empresa é igual à outra. Por isso não existe pacote pronto: existe *planejamento* feito sob medida para o seu negócio. Antes do problema, a estratégia. Durante a crise, a calma. Depois, a clareza."
              assinatura={`Princípio do ${SITE.nomeCompleto}`}
            />
          </div>
        </section>

        {/* ============ PRÁTICAS ============ */}
        <section className="bg-perola py-[clamp(6rem,14vh,9rem)] text-noite" aria-labelledby="praticas-titulo">
          <div className={conteiner}>
            <h2 id="praticas-titulo" className="max-w-[18ch] text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance">
              Duas especialidades. Uma só estratégia.
            </h2>
            <p className="mt-6 max-w-[38rem] text-[1.1875rem] leading-relaxed text-noite/60">
              O tributário e o empresarial caminham juntos: cada contrato tem efeito fiscal, cada reorganização mexe no caixa. Por isso tratamos os dois com a mesma equipe.
            </p>

            <div className="mt-16 grid gap-px overflow-hidden rounded-[1.75rem] bg-noite/10 md:grid-cols-2">
              {PRATICAS.map((p) => (
                <article key={p.id} id={p.id} className="flex scroll-mt-20 flex-col bg-white p-8 md:p-12">
                  <h3 className="texto-display text-[clamp(3.25rem,6vw,4.75rem)]">{p.titulo}</h3>
                  <p className="mt-5 max-w-[26rem] text-[1.0625rem] leading-relaxed text-noite/65">{p.tese}</p>
                  <ul className="mt-10 border-t border-noite/10">
                    {p.servicos.map((s) => (
                      <li key={s} className="flex items-center justify-between border-b border-noite/10 py-4 text-[1rem] font-medium">
                        {s}
                      </li>
                    ))}
                  </ul>
                  <a href="#contato" className="group mt-10 inline-flex items-center gap-0.5 self-start text-[1rem] font-medium text-[color-mix(in_oklch,var(--marca),black_22%)] hover:underline">
                    Falar sobre {p.titulo.toLowerCase()}
                    <ChevronRight className="size-[1.1em] transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.25} />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============ MÉTODO ============ */}
        <section id="metodo" className="scroll-mt-14 overflow-hidden bg-noite py-[clamp(6rem,14vh,9rem)]" aria-labelledby="metodo-titulo">
          <div className={conteiner}>
            <h2 id="metodo-titulo" className="max-w-[16ch] text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance">
              Do diagnóstico ao acompanhamento.
            </h2>
            <p className="mt-6 mb-14 max-w-[34rem] text-[1.1875rem] leading-relaxed text-camisa/55">Quatro etapas, sempre com um sócio responsável e prazos sob controle.</p>
          </div>
          <Metodo />
        </section>

        {/* ============ SÓCIOS ============ */}
        <section id="socios" className="scroll-mt-14 bg-noite pb-[clamp(6rem,14vh,9rem)]" aria-labelledby="socios-titulo">
          <div className={conteiner}>
            <div className="border-t border-white/10 pt-[clamp(5rem,12vh,8rem)]">
              <h2 id="socios-titulo" className="text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] font-semibold tracking-[-0.035em]">
                Quem conduz.
              </h2>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2">
              {SOCIOS.map((s) => (
                <article key={s.nome} className="group">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-[linear-gradient(165deg,#26272c_0%,#141518_60%,#0e0f11_100%)]">
                    {s.foto ? (
                      <Image src={s.foto} alt={s.nome} fill sizes="(min-width: 768px) 34rem, 100vw" className="object-cover transition-transform duration-[1.2s] ease-(--ease-apple) group-hover:scale-[1.02]" />
                    ) : (
                      <>
                        <div aria-hidden className="granulado absolute inset-0 opacity-[0.06] mix-blend-overlay" />
                        <span
                          aria-hidden
                          className="absolute inset-x-0 top-[0.04em] text-center font-display text-[clamp(18rem,34vw,30rem)] leading-none text-white/[0.075] transition-[transform,color] duration-[1.2s] ease-(--ease-apple) group-hover:-translate-y-2 group-hover:text-[color-mix(in_oklch,var(--marca)_22%,transparent)]"
                        >
                          {s.letra}
                        </span>
                      </>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgb(12_13_15/0.85),transparent)] p-7 pt-24 md:p-9 md:pt-28">
                      <p className="text-[0.8125rem] font-medium text-marca">{s.cargo}</p>
                      <h3 className="texto-display mt-2 text-[clamp(2.25rem,4vw,3.25rem)] text-camisa">{s.nome}</h3>
                    </div>
                  </div>
                  <div className="px-1 pt-6">
                    <p className="max-w-[30rem] text-[1.0625rem] leading-relaxed text-camisa/65">{s.bio}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.875rem] text-camisa/40">
                      <span>{s.oab}</span>
                      {s.instagram && (
                        <LinkSeta href={s.instagram} externo className="text-[0.9375rem]">
                          Instagram
                        </LinkSeta>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-24 grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-end">
              <h3 className="texto-display text-[clamp(2.5rem,5vw,4rem)]">E uma equipe inteira por trás de cada caso.</h3>
              <div>
                <p className="text-[1.0625rem] leading-relaxed text-camisa/60">
                  Advogados e analistas organizados por especialidade, coordenados pelos sócios. Cada cliente sabe com quem fala, e cada prazo tem um responsável.
                </p>
                {EQUIPE.length > 0 && (
                  <ul className="mt-8 grid gap-x-8 sm:grid-cols-2">
                    {EQUIPE.map((m) => (
                      <li key={m.nome} className="border-t border-white/10 py-3.5">
                        <p className="font-medium text-camisa">{m.nome}</p>
                        <p className="text-sm text-camisa/45">{m.funcao}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <LinkSeta href={SITE.instagram} externo className="mt-6 text-[1rem]">
                  Acompanhe o escritório no Instagram
                </LinkSeta>
              </div>
            </div>
          </div>
        </section>

        {/* ============ DÚVIDAS ============ */}
        <section id="duvidas" className="bg-perola py-[clamp(6rem,14vh,9rem)] text-noite" aria-labelledby="duvidas-titulo">
          <div className={`${conteiner} grid gap-12 lg:grid-cols-[1fr_1.7fr]`}>
            <div>
              <h2 id="duvidas-titulo" className="text-[clamp(2.25rem,4.4vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.035em]">
                Antes da primeira conversa.
              </h2>
              <p className="mt-5 text-[1.0625rem] text-noite/55">Não encontrou sua dúvida? Pergunte direto para a equipe.</p>
            </div>
            <Duvidas />
          </div>
        </section>

        {/* ============ CONTATO ============ */}
        <section id="contato" className="relative isolate scroll-mt-14 overflow-hidden bg-noite py-[clamp(6rem,14vh,9rem)]" aria-labelledby="contato-titulo">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60%] bg-[radial-gradient(50%_60%_at_20%_0%,color-mix(in_oklch,var(--marca)_16%,transparent),transparent_75%)]"
          />
          <div className={`${conteiner} grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20`}>
            <div>
              <h2 id="contato-titulo" className="texto-display text-[clamp(3.5rem,8vw,6rem)]">
                Vamos conversar.
              </h2>
              <p className="mt-7 max-w-[26rem] text-[1.1875rem] leading-relaxed text-camisa/60">
                Uma reunião de diagnóstico para entender o cenário da sua empresa e apontar caminhos. Sem compromisso de contratação.
              </p>
              <dl className="mt-14 grid gap-7 text-[1rem]">
                <div>
                  <dt className="text-[0.8125rem] text-camisa/40">WhatsApp</dt>
                  <dd className="mt-1">
                    <a href={WHATSAPP} target="_blank" rel="noreferrer" className="tabular text-[1.375rem] font-medium tracking-[-0.01em] hover:text-marca">
                      {SITE.telefone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.8125rem] text-camisa/40">Instagram</dt>
                  <dd className="mt-1">
                    <a href={SITE.instagram} target="_blank" rel="noreferrer" className="hover:text-marca">
                      {SITE.instagramUsuario}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.8125rem] text-camisa/40">Escritório</dt>
                  <dd className="mt-1 text-camisa/80">
                    {SITE.cidade} · atendimento em todo o Brasil
                    <br />
                    <span className="text-camisa/50">{SITE.horario}</span>
                  </dd>
                </div>
              </dl>
            </div>
            <div className="rounded-[1.75rem] bg-grafite p-7 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] ring-1 ring-white/[0.06] sm:p-10">
              <FormularioContato />
            </div>
          </div>
        </section>
      </main>

      {/* ============ RODAPÉ ============ */}
      <footer className="border-t border-white/[0.08] bg-noite py-12 text-[0.75rem] text-camisa/45">
        <div className={conteiner}>
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 text-camisa">
              <Monograma claro className="size-8" />
              <span className="font-display text-[1.125rem] tracking-tight">{SITE.nomeCompleto}</span>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[0.8125rem] text-camisa/55" aria-label="Rodapé">
              <a href="#tributario" className="hover:text-camisa">Tributário</a>
              <a href="#empresarial" className="hover:text-camisa">Empresarial</a>
              <a href="#socios" className="hover:text-camisa">Sócios</a>
              <a href="#contato" className="hover:text-camisa">Contato</a>
              <Link href="/login" className="inline-flex items-center gap-0.5 hover:text-camisa">
                Área da equipe <ArrowUpRight className="size-3.5" />
              </Link>
            </nav>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-white/[0.08] pt-6 md:flex-row md:justify-between">
            <p>
              © {new Date().getFullYear()} {SITE.nomeCompleto} · Sociedade de advogados · {SITE.registroOab} · CNPJ {SITE.cnpj}
            </p>
            <p>Conteúdo informativo, conforme o Código de Ética e Disciplina da OAB e o Provimento nº 205/2021.</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp flutuante */}
      <a
        href={WHATSAPP}
        target="_blank"
        rel="noreferrer"
        aria-label="Conversar pelo WhatsApp"
        className="fixed right-4 bottom-4 z-40 flex size-13 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_-6px_rgb(0_0_0/0.5)] transition-transform duration-200 hover:scale-105 active:scale-95 md:right-6 md:bottom-6"
      >
        <MessageCircle className="size-6" />
      </a>
    </div>
  );
}
