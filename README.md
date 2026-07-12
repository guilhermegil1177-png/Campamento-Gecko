# 🦎 Campamento Gecko

Aplicação web PWA para gestão profissional de acampamentos. Substitui WhatsApp e folhas de cálculo por uma plataforma centralizada e intuitiva.

## Stack Técnica

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4 (Dark Theme)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Hosting:** Vercel (Serverless)
- **PWA:** Service Worker + IndexedDB (funciona offline)

## Funcionalidades

### ✅ Implementadas (v2.0)
- 🔐 **Autenticação** via Supabase Auth (com modo demo offline)
- 👥 **Roles:** Director, Monitor, Admin com permissões diferenciadas
- 📅 **Dashboard** personalizado com atalhos e overview
- 📋 **Cronogramas** - CRUD completo com timeline vertical
- 📚 **Biblioteca de Atividades** - categorizada (outdoor, indoor, craft, sport)
- 🔔 **Notificações** automáticas 10 min antes de cada atividade
- 📱 **PWA** - funciona offline, instalável no iPhone/Android
- 🌙 **Dark Theme** como padrão

### 🔜 Roadmap (Phase 5-6)
- 💬 Chat em tempo real por cronograma (Supabase Realtime)
- 📊 Dashboard de relatórios (PDF/Excel)
- 📅 Integração Google Calendar
- 📱 App nativa (React Native/Expo)

## Instalação

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.local.example .env.local
# Editar .env.local com as credenciais Supabase

# Desenvolvimento
pnpm dev

# Build produção
pnpm build
```

## Configuração Supabase

1. Criar projeto em [supabase.com](https://supabase.com)
2. Executar `supabase_schema.sql` no SQL Editor
3. Copiar URL e anon key para `.env.local`
4. Criar utilizador em Authentication > Users

**Sem Supabase:** A app funciona em modo demo com dados locais (IndexedDB).

## Deploy (Vercel)

1. Push para GitHub
2. Conectar repositório no Vercel
3. Adicionar variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy automático

## Estrutura do Projeto

```
client/src/
├── pages/
│   ├── Login.tsx          # Autenticação
│   ├── Home.tsx           # Dashboard principal
│   ├── Schedules.tsx      # CRUD cronogramas
│   ├── Activities.tsx     # Biblioteca atividades
│   ├── ImportDay.tsx      # Importar por texto
│   └── Settings.tsx       # Configurações
├── contexts/
│   ├── AuthContext.tsx    # Auth + roles
│   └── ThemeContext.tsx   # Dark/light theme
├── components/
│   └── TimeSlotCard.tsx   # Card de atividade
├── hooks/
│   ├── useOfflineStorage  # IndexedDB
│   └── useNotificationManager
├── lib/
│   ├── supabase.ts        # Cliente Supabase
│   └── sampleData.ts      # Dados de exemplo
└── types/index.ts         # Tipos TypeScript
```

---
*Campamento Gecko v2.0 • React 19 + Supabase + Tailwind CSS 4*
