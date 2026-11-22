import { ExternalLink, HeartHandshake, MousePointerClick, TrendingUp } from "lucide-react";
import { BotaoLink, Cabecalho, Card, Indicador, Tabela, Td } from "@/components/kit";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { FERRAMENTAS } from "../../comunidade/catalogo";

export const metadata = { title: "Apoio à comunidade" };

export default async function ApoioComunidadeInterno() {
  await exigirUsuario();
  const d = new Date();
  const hoje = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const ha30 = new Date(hoje.getTime() - 29 * 86400000);
  const [total, ultimos, porFerramenta, porFerramenta30] = await Promise.all([
    db.usoFerramenta.aggregate({ _sum: { total: true } }),
    db.usoFerramenta.aggregate({ _sum: { total: true }, where: { dia: { gte: ha30 } } }),
    db.usoFerramenta.groupBy({ by: ["ferramenta"], _sum: { total: true } }),
    db.usoFerramenta.groupBy({ by: ["ferramenta"], _sum: { total: true }, where: { dia: { gte: ha30 } } }),
  ]);
  const mapa = new Map(porFerramenta.map((p) => [p.ferramenta, p._sum.total ?? 0]));
  const mapa30 = new Map(porFerramenta30.map((p) => [p.ferramenta, p._sum.total ?? 0]));
  const linhas = [...FERRAMENTAS].sort((a, b) => (mapa.get(b.id) ?? 0) - (mapa.get(a.id) ?? 0));
  const maisUsada = linhas[0] && (mapa.get(linhas[0].id) ?? 0) > 0 ? linhas[0].titulo : "—";

  return (
    <>
      <Cabecalho
        titulo="Apoio à comunidade"
        codigo="COM"
        subtitulo="Ferramentas gratuitas e acessíveis da página pública /comunidade · contagem anônima, sem dados pessoais"
        acoes={
          <BotaoLink href="/comunidade" target="_blank" variante="secundario">
            <ExternalLink /> Abrir página pública
          </BotaoLink>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Indicador rotulo="Cálculos realizados" valor={(total._sum.total ?? 0).toLocaleString("pt-BR")} detalhe="desde a publicação" icone={MousePointerClick} />
        <Indicador rotulo="Últimos 30 dias" valor={(ultimos._sum.total ?? 0).toLocaleString("pt-BR")} detalhe="cálculos e textos gerados" icone={TrendingUp} />
        <Indicador rotulo="Mais usada" valor={<span className="text-lg">{maisUsada}</span>} icone={HeartHandshake} />
      </div>
      <div className="mt-6">
        <Tabela colunas={["Ferramenta", "Público", "Últimos 30 dias", "Total"]}>
          {linhas.map((f) => (
            <tr key={f.id}>
              <Td>
                <a href={`/comunidade#${f.id}`} target="_blank" className="font-medium hover:underline">
                  {f.titulo}
                </a>
              </Td>
              <Td>{f.publico === "pf" ? "Pessoa física" : "Empresas e MEI"}</Td>
              <Td className="tabular">{(mapa30.get(f.id) ?? 0).toLocaleString("pt-BR")}</Td>
              <Td className="tabular">{(mapa.get(f.id) ?? 0).toLocaleString("pt-BR")}</Td>
            </tr>
          ))}
        </Tabela>
      </div>
      <Card className="mt-6" titulo="Como divulgar">
        <p className="text-sm text-muted-foreground">
          Compartilhe o endereço da página pública (por exemplo, <span className="font-mono">seusite.com.br/comunidade</span>) em um QR Code na recepção, no site e nas redes
          sociais. Para abrir direto numa ferramenta, acrescente o código ao final: <span className="font-mono">/comunidade#mei</span>,{" "}
          <span className="font-mono">/comunidade#rescisao</span>. A página não pede cadastro e não guarda dados de quem a usa.
        </p>
      </Card>
    </>
  );
}
