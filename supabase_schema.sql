-- ============================================================
-- Campamento Gecko - Supabase Database Schema
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'monitor' CHECK (role IN ('director', 'monitor', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SCHEDULES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data DATE NOT NULL,
  criado_por UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TIME_SLOTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  hora TEXT NOT NULL,  -- HH:MM
  titulo TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  notas JSONB DEFAULT '[]',
  atribuido_a JSONB DEFAULT '[]',
  concluido BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ACTIVITIES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  categoria TEXT NOT NULL DEFAULT 'other' CHECK (categoria IN ('outdoor', 'indoor', 'craft', 'sport', 'other')),
  instrucoes TEXT,
  video_url TEXT,
  imagem_url TEXT,
  materiais JSONB DEFAULT '[]',
  duracao INTEGER,  -- minutos
  dificuldade TEXT CHECK (dificuldade IN ('facil', 'medio', 'dificil')),
  criado_por UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── MESSAGES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── NOTIFICATIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE,
  time_slot_id UUID REFERENCES public.time_slots(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT DEFAULT '',
  lido BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users: can read all, update own
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Schedules: all authenticated can read; directors/admins can write
CREATE POLICY "Authenticated can view schedules" ON public.schedules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Directors can create schedules" ON public.schedules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('director', 'admin'))
);
CREATE POLICY "Directors can update schedules" ON public.schedules FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('director', 'admin'))
);
CREATE POLICY "Directors can delete schedules" ON public.schedules FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('director', 'admin'))
);

-- Time slots: same as schedules
CREATE POLICY "Authenticated can view time_slots" ON public.time_slots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Monitors can update time_slots" ON public.time_slots FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Directors can manage time_slots" ON public.time_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('director', 'admin'))
);

-- Activities: all can read; directors can write
CREATE POLICY "Authenticated can view activities" ON public.activities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Directors can manage activities" ON public.activities FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('director', 'admin'))
);

-- Messages: authenticated users
CREATE POLICY "Authenticated can view messages" ON public.messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Notifications: own only
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can mark own as read" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ── TRIGGERS (updated_at) ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER time_slots_updated_at BEFORE UPDATE ON public.time_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── SAMPLE DATA ────────────────────────────────────────────
-- Insert a demo director (update with real auth user ID after signup)
-- INSERT INTO public.users (id, email, nome, role) VALUES
--   ('your-auth-user-id', 'director@campamentogecko.com', 'Director Demo', 'director');
