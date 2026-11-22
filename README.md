# Peticiona · Sistema de gestão para escritórios de advocacia

Sistema de gestão de código aberto para pequenos escritórios de advocacia, com uma área pública de **apoio à comunidade**. Esta versão usa um escritório fictício ("Escritório Modelo") e dados de demonstração: nenhum dado real de clientes. A raiz (`/`) abre o login; depois dele, o launchpad em `/painel`. O site institucional é publicado à parte; uma versão antiga dele ficou guardada em `src/site/` (fora das rotas).

## Site

- Landing page de advocacia empresarial com formulário de captação, botão de WhatsApp, dúvidas frequentes e dados estruturados para o Google.
- Cada contato enviado vira um **lead** no sistema e uma tarefa urgente de retorno para o administrador.
- **Antes de publicar**, edite `src/site/config.ts` (itens marcados com `PREENCHER`: sócios, OAB, telefone, WhatsApp, e-mail, endereço).
- O texto segue o Provimento OAB nº 205/2021: sem promessa de resultado, preços ou captação mercantil.

Sistema de gestão para escritórios de advocacia: clientes, processos, CRM, agenda, tarefas, intimações, financeiro, modelos de peças e geração de petições com IA.

## Replicar para outro escritório

O sistema é dedicado a um escritório por instalação. Para montar outra:

1. Edite `src/marca.ts`: nome, sufixo, letras do monograma, cor da marca e cidade. Login, menu, abas do navegador e site usam esses dados.
2. Edite `src/site/config.ts`: contatos, sócios (com foto opcional em `/public/socios/`), equipe e áreas de atuação.
3. Use um banco e um `AUTH_SECRET` próprios.

Para o modo plataforma (vários escritórios na mesma instalação), defina `PERMITIR_CADASTRO=1` no `.env`: a tela de login passa a oferecer "Criar conta". Os dados já são isolados por escritório.

## Rodando localmente

```bash
npm install
npx prisma db push      # cria o banco SQLite (prisma/dev.db)
npx tsx prisma/seed.ts  # dados iniciais e de exemplo
npm run demo            # opcional: clientes, processos, financeiro, audiências, iniciais, RPVs e empréstimos
npm run dev             # http://localhost:3000
```

## Interface

Next.js 16 + Tailwind CSS 4 com **shadcn/ui** (Radix), **Recharts** (gráficos), **dnd-kit** (kanban do CRM), **cmdk** (busca global com `Ctrl+K`), **Sonner** (notificações), **Motion** (animações) e **next-themes** (modo claro/escuro). Tipografia Geist + EB Garamond.

Login de exemplo: `admin@escritoriomodelo.adv.br` / `modelo123`. Também dá para criar um escritório novo na tela de login.

## Configuração (`.env`)

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Banco de dados. Padrão: `file:./dev.db` (SQLite). |
| `AUTH_SECRET` | Segredo que assina a sessão. Gere um valor aleatório longo. |
| `ANTHROPIC_API_KEY` | Opcional. Ativa a geração de peças com IA (Claude Opus 5.5). |
| `REPOSITORIO_URL` | Opcional. Link do código aberto exibido no rodapé de `/comunidade`. |

## Módulos

A interface segue o modelo de ERP (SAP Fiori): barra superior com **campo de transação** (digite o código e Enter), menu por módulo, launchpad com indicadores e listas em grade (busca, filtro por coluna, escolha de colunas, totais e exportação para Excel).

| Código | Tela | Rota | O que faz |
|---|---|---|---|
| `IN` | Launchpad | `/painel` | Blocos com prazos vencidos/da semana, audiências, iniciais, processos, financeiro e a agenda de 7 dias |
| `PR1` | Processos · 1ª instância | `/processos` | Processos com vara, comarca, próximo prazo (semáforo) e próxima audiência |
| `PR2` | 2ª instância e tribunais | `/processos?aba=2` | Recurso, turma/câmara, relator, vara de origem, matéria, situação, sessão, % do contrato e RPV |
| `AUD` | Audiências | `/audiencias` | Conciliação, instrução, instrução e julgamento, una; modalidade, local/link, resultado |
| `INI` | Controle de iniciais | `/iniciais` | Ações a propor até o protocolo; ao protocolar, vira processo |
| `INT` | Intimações | `/intimacoes` | Publicações; vincula pelo número CNJ e cria tarefa de prazo |
| `TAR` | Prazos e tarefas | `/atividades` | Prazos e tarefas com responsável e pontos |
| `AG` | Agenda | `/agenda` | Calendário com compromissos, prazos e audiências |
| `CALC` | Calculadora de prazos | `/prazos` | Dias úteis (CPC 219/224), feriados, recesso e regra do DJe |
| `FIN` | Lançamentos | `/financeiro` | Receitas, despesas, transferências e parcelamento |
| `CR` / `CP` | Contas a receber / a pagar | `/financeiro/receber`, `/financeiro/pagar` | Tudo em aberto, com faixa de atraso |
| `FLX` | Fluxo de caixa projetado | `/financeiro/fluxo` | 12 meses a partir do saldo atual, com RPVs e parcelas de empréstimos |
| `EMP` | Empréstimos | `/financeiro/emprestimos` | Gera as parcelas (Price ou valor do contrato), baixa e quitação |
| `RPV` | RPV e precatórios | `/financeiro/rpv` | Parte do escritório pelo % do contrato; a baixa lança a receita |
| `CLI`, `LD`, `CRM`, `PAR` | Contatos, leads, CRM, parceiros | | Carteira de clientes e funil |
| `MOD`, `HR` | Modelos e IA, horas | | Peças com variáveis/IA e timesheet |
| `REL`, `CFG` | Relatórios, configurações | | Visão gerencial; usuários, papéis e carteira |
| `COM` | Apoio à comunidade | `/apoio-comunidade` | Uso das ferramentas públicas (contagem anônima) e link para divulgar |

Atalhos de criação: `PR01` (processo), `CLI01` (contato), `AUD01`, `INI01`, `TAR01`, `FIN01`/`FIN02` (receita/despesa), `EMP01`.

### Carteira e autorizações

- **Minha carteira / Escritório** (barra superior): alterna todas as listas entre os processos do usuário e os do escritório.
- **Carteira própria** (Configurações › Equipe): o usuário só enxerga os processos, audiências e iniciais em que é responsável.
- **Financeiro, empréstimos, RPVs e relatórios**: só papéis Administrador e Financeiro. Advogados registram RPVs pela ficha do processo; a baixa é do financeiro.

Documentos gerados podem ser editados, impressos/salvos em PDF pelo navegador ou baixados em Word (`.doc`).

## Apoio à Comunidade (`/comunidade`)

Página **pública, gratuita e sem login** com ferramentas em linguagem simples, para que pessoas de baixa renda, empreendedores e MEIs tenham acesso a informações jurídicas básicas sem custo.

| Para pessoas físicas | Para empresas e MEI |
|---|---|
| Rescisão trabalhista (saldo, aviso proporcional, 13º, férias, multa do FGTS) | DAS do MEI e acompanhamento do limite anual de faturamento |
| Imposto de Renda no salário (INSS, IRRF e redução da Lei 15.270/2025) | Simples Nacional: alíquota efetiva, faixa e Fator R |
| Juros e multa de dívidas (com alerta da multa máxima de 2% do CDC) | Custo de um funcionário por regime tributário |
| Simulador de pensão alimentícia | Imposto federal em atraso (multa de mora e Selic) |
| Gerador de reclamação do consumidor (CDC) | Gerador de recibo com valor por extenso |
| Glossário jurídico | Checklist para abrir, manter e encerrar o MEI |

Também traz a aba **Onde buscar ajuda** (Defensoria Pública, Juizado Especial, Procon, Sebrae, Disque 100, Ligue 180).

**Acessibilidade** (WCAG 2.1 AA e eMAG): link "pular para o conteúdo", navegação completa pelo teclado (abas com setas), rótulos em todos os campos, resultado anunciado automaticamente ao leitor de tela (`aria-live`) com foco movido para ele, botões de aumentar o texto, alto contraste e "ouvir página/resultado" (síntese de voz do navegador) e tradução para Libras pelo **VLibras**. Verificado com navegação só pelo teclado; vale testar também com um leitor de tela (NVDA, gratuito).

**Privacidade e ética**: os cálculos rodam no navegador e nenhum dado pessoal é enviado. O servidor só soma, de forma anônima, quantas vezes cada ferramenta foi usada por dia (tabela `UsoFerramenta`), mostrado em `COM`. Todas as telas avisam que os resultados são estimativas e não substituem um advogado, e a página não é usada para captação de clientes (Provimento OAB nº 205/2021).

- Para abrir direto numa ferramenta: `/comunidade#rescisao`, `/comunidade#mei`, `/comunidade#ajuda`...
- Os valores de referência (salário mínimo, tabelas do INSS e do IR, limite do MEI) ficam em `PARAMETROS`, em `src/lib/comunidade.ts`. **Atualize todo ano.**
- Opcional: defina `REPOSITORIO_URL` no `.env` para mostrar o link do código aberto no rodapé.

## Produção

- Troque o `provider` em `prisma/schema.prisma` para `postgresql` e aponte `DATABASE_URL` para o banco.
- Defina `AUTH_SECRET` forte e sirva com HTTPS (o cookie de sessão vira `secure` em produção).
- Datas e horas usam o fuso do servidor; configure `TZ=America/Sao_Paulo`.

## Para quem é

- **Advogados recém-formados e pequenos escritórios** que precisam organizar prazos, processos e honorários e não podem pagar um software jurídico caro.
- **Núcleos de prática jurídica e associações**, que podem instalar e adaptar o sistema livremente.
- **Estudantes de computação**, que podem estudar o código e contribuir com novos módulos.

## Licença

Código aberto sob a licença [MIT](LICENSE): uso, cópia, adaptação e distribuição gratuitos, inclusive comercial, mantendo o aviso de licença.

Projeto desenvolvido no Projeto de Extensão III (Ciência da Computação) em parceria com um escritório de advocacia. Os nomes, contatos e dados desta versão são fictícios.
