"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCompacto = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

const configFluxo = {
  receita: { label: "Receita", color: "var(--chart-2)" },
  despesa: { label: "Despesa", color: "var(--chart-5)" },
} satisfies ChartConfig;

/** Receitas x despesas por mês (área). */
export function GraficoFluxo({ dados, altura = 260 }: { dados: { mes: string; receita: number; despesa: number }[]; altura?: number }) {
  return (
    <ChartContainer config={configFluxo} className="w-full" style={{ height: altura }}>
      <AreaChart data={dados} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          {(["receita", "despesa"] as const).map((k) => (
            <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`var(--color-${k})`} stopOpacity={0.35} />
              <stop offset="95%" stopColor={`var(--color-${k})`} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => brlCompacto.format(v)} />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" formatter={(v, nome) => (
          <div className="flex w-full justify-between gap-6">
            <span className="text-muted-foreground">{configFluxo[nome as keyof typeof configFluxo]?.label}</span>
            <span className="tabular font-medium">{brl.format(Number(v))}</span>
          </div>
        )} />} />
        <Area dataKey="receita" type="monotone" stroke="var(--color-receita)" strokeWidth={2} fill="url(#grad-receita)" />
        <Area dataKey="despesa" type="monotone" stroke="var(--color-despesa)" strokeWidth={2} fill="url(#grad-despesa)" />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}

/** Entradas x saídas por mês em colunas lado a lado (valores mensais discretos, ex.: fluxo projetado). */
export function GraficoColunas({ dados, altura = 260 }: { dados: { mes: string; receita: number; despesa: number }[]; altura?: number }) {
  return (
    <ChartContainer config={configFluxo} className="w-full" style={{ height: altura }}>
      <BarChart data={dados} margin={{ left: 4, right: 8, top: 8 }} barGap={2}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => brlCompacto.format(v)} />
        <ChartTooltip cursor={{ fillOpacity: 0.06 }} content={<ChartTooltipContent indicator="dot" formatter={(v, nome) => (
          <div className="flex w-full justify-between gap-6">
            <span className="text-muted-foreground">{nome === "receita" ? "Entradas" : "Saídas"}</span>
            <span className="tabular font-medium">{brl.format(Number(v))}</span>
          </div>
        )} />} />
        <Bar dataKey="receita" fill="var(--color-receita)" radius={[3, 3, 0, 0]} maxBarSize={22} />
        <Bar dataKey="despesa" fill="var(--color-despesa)" radius={[3, 3, 0, 0]} maxBarSize={22} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}

/** Barras horizontais com rótulo (ex.: processos por área). */
export function GraficoBarras({ dados, moeda = false, cor = "var(--chart-1)" }: { dados: { rotulo: string; valor: number }[]; moeda?: boolean; cor?: string }) {
  const config = { valor: { label: moeda ? "Valor" : "Quantidade", color: cor } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="w-full" style={{ height: Math.max(160, dados.length * 40) }}>
      <BarChart data={dados} layout="vertical" margin={{ left: 0, right: moeda ? 80 : 40 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="rotulo" type="category" tickLine={false} axisLine={false} width={120} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(v) => <span className="tabular font-medium">{moeda ? brl.format(Number(v)) : String(v)}</span>} />} />
        <Bar dataKey="valor" fill="var(--color-valor)" radius={6} label={{ position: "right", className: "fill-muted-foreground text-xs", formatter: (v: unknown) => (moeda ? brlCompacto.format(Number(v)) : String(v)) }} />
      </BarChart>
    </ChartContainer>
  );
}

const CORES_ROSCA = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/** Rosca para proporções com até 5 categorias. */
export function GraficoRosca({ dados }: { dados: { rotulo: string; valor: number }[] }) {
  const config = Object.fromEntries(dados.map((d, i) => [d.rotulo, { label: d.rotulo, color: CORES_ROSCA[i % CORES_ROSCA.length] }])) satisfies ChartConfig;
  const total = dados.reduce((s, d) => s + d.valor, 0);
  return (
    <ChartContainer config={config} className="mx-auto aspect-square w-full max-w-[240px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="rotulo" hideLabel />} />
        <Pie data={dados} dataKey="valor" nameKey="rotulo" innerRadius={62} outerRadius={95} paddingAngle={2} strokeWidth={0}>
          {dados.map((d, i) => (
            <Cell key={d.rotulo} fill={CORES_ROSCA[i % CORES_ROSCA.length]} />
          ))}
        </Pie>
        <text x="50%" y="48%" textAnchor="middle" className="fill-foreground text-2xl font-semibold">
          {total}
        </text>
        <text x="50%" y="58%" textAnchor="middle" className="fill-muted-foreground text-xs">
          total
        </text>
      </PieChart>
    </ChartContainer>
  );
}
