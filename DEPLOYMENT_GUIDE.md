# Camp Daily Scheduler - Guia de Deployment

## 🚀 Publicar em Vercel

### Pré-requisitos
- Conta em [Vercel](https://vercel.com)
- Projeto no GitHub
- Supabase configurado (opcional)

### Passo 1: Push para GitHub
```bash
git init
git add .
git commit -m "Initial commit: Camp Scheduler PWA"
git branch -M main
git remote add origin https://github.com/seu-usuario/camp-scheduler.git
git push -u origin main
```

### Passo 2: Conectar ao Vercel
1. Aceda a [vercel.com/new](https://vercel.com/new)
2. Selecione "Import Git Repository"
3. Cole o URL do seu repositório GitHub
4. Clique em "Import"

### Passo 3: Configurar Variáveis de Ambiente
No painel do Vercel:
1. Vá a **Settings > Environment Variables**
2. Adicione as seguintes variáveis (se usar Supabase):
   - `VITE_SUPABASE_URL` - URL do seu projeto Supabase
   - `VITE_SUPABASE_ANON_KEY` - Chave anônima do Supabase

### Passo 4: Deploy
1. Clique em "Deploy"
2. Aguarde a conclusão (geralmente 2-3 minutos)
3. Copie o URL público (ex: `https://camp-scheduler.vercel.app`)

---

## 🗄️ Configurar Supabase (Opcional)

### Passo 1: Criar Projeto Supabase
1. Aceda a [supabase.com](https://supabase.com)
2. Clique em "New Project"
3. Preencha os detalhes:
   - **Name**: camp-scheduler
   - **Database Password**: Guarde com segurança
   - **Region**: Escolha a mais próxima

### Passo 2: Criar Tabelas

#### Tabela: `camp_days`
```sql
CREATE TABLE camp_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_camp_days_user_id ON camp_days(user_id);
```

#### Tabela: `time_slots`
```sql
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  camp_day_id UUID NOT NULL,
  time TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  notes JSONB DEFAULT '[]',
  assignees JSONB DEFAULT '[]',
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (camp_day_id) REFERENCES camp_days(id) ON DELETE CASCADE
);

CREATE INDEX idx_time_slots_camp_day_id ON time_slots(camp_day_id);
```

### Passo 3: Configurar RLS (Row Level Security)
```sql
-- Ativar RLS
ALTER TABLE camp_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

-- Políticas para camp_days
CREATE POLICY "Users can view their own camp days"
  ON camp_days FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own camp days"
  ON camp_days FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own camp days"
  ON camp_days FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own camp days"
  ON camp_days FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para time_slots (através de camp_days)
CREATE POLICY "Users can view time slots of their camp days"
  ON time_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM camp_days
      WHERE camp_days.id = time_slots.camp_day_id
      AND camp_days.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert time slots in their camp days"
  ON time_slots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM camp_days
      WHERE camp_days.id = time_slots.camp_day_id
      AND camp_days.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update time slots in their camp days"
  ON time_slots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM camp_days
      WHERE camp_days.id = time_slots.camp_day_id
      AND camp_days.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete time slots in their camp days"
  ON time_slots FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM camp_days
      WHERE camp_days.id = time_slots.camp_day_id
      AND camp_days.user_id = auth.uid()
    )
  );
```

### Passo 4: Copiar Credenciais
1. Vá a **Settings > API**
2. Copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`

---

## 📦 Estrutura do Projeto

```
camp-scheduler/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx          # Página principal
│   │   │   ├── ImportDay.tsx     # Importar esquemas
│   │   │   └── Settings.tsx      # Configurações
│   │   ├── components/
│   │   │   └── TimeSlotCard.tsx  # Card de atividade
│   │   ├── hooks/
│   │   │   ├── useOfflineStorage.ts    # IndexedDB
│   │   │   └── useNotificationManager.ts # Notificações
│   │   ├── lib/
│   │   │   ├── schemaParser.ts   # Parser de esquemas
│   │   │   └── sampleData.ts     # Dados de exemplo
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript types
│   │   ├── App.tsx               # Roteamento
│   │   ├── main.tsx              # Entry point
│   │   └── index.css             # Estilos globais
│   ├── public/
│   │   ├── manifest.json         # PWA manifest
│   │   └── sw.js                 # Service Worker
│   └── index.html                # HTML template
├── server/
│   └── index.ts                  # Express server
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🔧 Variáveis de Ambiente

### Para Desenvolvimento Local
Crie um arquivo `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Para Vercel
Configure no painel do Vercel:
- Settings > Environment Variables
- Adicione as mesmas variáveis acima

---

## 🧪 Testar Localmente

```bash
# Instalar dependências
pnpm install

# Desenvolvimento
pnpm dev

# Build
pnpm build

# Preview
pnpm preview
```

---

## 📱 Publicar como PWA no iPhone

1. Aceda ao URL do Vercel no Safari do iPhone
2. Toque em Partilhar > "Adicionar à Tela Inicial"
3. Escolha um nome e toque em "Adicionar"

---

## 🐛 Troubleshooting

### Build falha com erro de tipos
```bash
pnpm check
```

### Limpar cache
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Problemas com Service Worker
1. Limpe o cache do navegador
2. Desative o Service Worker em DevTools
3. Recarregue a página

---

## 📞 Suporte

Para problemas:
1. Verifique os logs do Vercel (Deployments > Logs)
2. Verifique o console do navegador (F12)
3. Verifique os logs do Supabase (se aplicável)

---

**Versão**: 1.0.0  
**Última atualização**: Julho 2026
