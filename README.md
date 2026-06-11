# INVEST GD — Plataforma de Viabilidade de Geração Distribuída

Sistema web profissional para análise econômico-financeira de ativos de geração de energia (UFV, CGH, PCH, Eólica).

---

## Fase 1 — O que está implementado

- **Dashboard** com tabela de estudos, filtros, estatísticas
- **Cadastro de estudos** (3 abas: Usina, Premissas, Parâmetros)
- **CRUD completo** via Firebase Firestore (criar, editar, duplicar, excluir)
- **Sem autenticação** — acesso direto ao dashboard
- **Interface** inspirada em Stripe / Vercel Dashboard

## Fase 2 — Planejado

- VPL, TIR, ROI, Payback simples e descontado
- Índice de Lucratividade
- Fluxo de caixa e gráficos (Recharts)
- Relatório PDF profissional
- Integração automática com base ANEEL
- Comparação SELIC / TMA / CDI / IPCA

---

## Stack

| Camada       | Tecnologia              |
|-------------|------------------------|
| Frontend     | React 18 + TypeScript  |
| Build        | Vite                   |
| Estilo       | Tailwind CSS + Shadcn/UI (Radix UI) |
| Banco        | Firebase Firestore     |
| Deploy       | Vercel                 |

---

## Como rodar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Firebase

O arquivo `.env` já está preenchido com as credenciais do projeto `invest-gd`.
Se necessário, edite os valores em `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=invest-gd.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=invest-gd
VITE_FIREBASE_STORAGE_BUCKET=invest-gd.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1084458937220
VITE_FIREBASE_APP_ID=1:1084458937220:web:a827fa4421e917d9490bd1
```

### 3. Configurar Firestore

No Firebase Console → Firestore → Rules, cole o conteúdo de `firestore.rules`.

**Coleções criadas automaticamente:**
- `studies` — estudos de viabilidade
- `results` — resultados dos cálculos (Fase 2)
- `tariffs` — tarifas ANEEL (Fase 2)
- `reports` — relatórios gerados (Fase 2)
- `settings` — configurações (Fase 2)

### 4. Rodar localmente

```bash
npm run dev
```

Acesse: [http://localhost:5173](http://localhost:5173)

O sistema abre **diretamente no Dashboard** — sem login.

---

## Deploy na Vercel

1. Push para GitHub
2. Vercel → New Project → importar repositório
3. Em **Environment Variables**, adicionar todas as `VITE_*` do `.env`
4. Deploy automático em cada `git push main`

---

## Estrutura

```
src/
├── components/ui/     # Shadcn/UI — Button, Input, Select, Card, Badge, Dialog, Tabs, Tooltip…
├── pages/             # DashboardPage, StudyFormPage
├── layouts/           # MainLayout (sidebar + topbar)
├── services/          # firebase.ts, studyService.ts (CRUD Firestore)
├── types/             # study.ts — interfaces TypeScript
├── hooks/             # useStudies.ts
├── utils/             # formatters.ts
├── lib/               # utils.ts (cn)
└── App.tsx
```
