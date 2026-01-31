-- ============================================
-- MIGRAÇÃO COMPLETA DO SISTEMA TOR
-- ============================================

-- 1. Tabela de Perfis de Usuários (para autenticação)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Efetivo
CREATE TABLE IF NOT EXISTS personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  graduation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Viaturas
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  prefix TEXT,
  model TEXT,
  year TEXT,
  plate TEXT,
  odometer INTEGER DEFAULT 0,
  oil_interval INTEGER DEFAULT 10000,
  last_oil_change_odometer INTEGER DEFAULT 0,
  color TEXT,
  status TEXT DEFAULT 'OPERANDO',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Equipes/Escalas
CREATE TABLE IF NOT EXISTS operational_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sector TEXT,
  vehicle_id TEXT REFERENCES vehicles(id),
  members JSONB DEFAULT '[]',
  status TEXT DEFAULT 'Patrulhamento',
  color TEXT DEFAULT '#0284c7',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_teams ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS DE ACESSO PARA user_profiles
-- ============================================

-- Permitir que usuários vejam seu próprio perfil
CREATE POLICY "Usuários podem ver próprio perfil" 
ON user_profiles FOR SELECT 
USING (auth.uid() = id);

-- Permitir que admins vejam todos os perfis
CREATE POLICY "Admins podem ver todos os perfis" 
ON user_profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permitir criação de perfil durante signup (via trigger)
CREATE POLICY "Permitir insert durante signup" 
ON user_profiles FOR INSERT 
WITH CHECK (true);

-- Permitir que admins atualizem perfis
CREATE POLICY "Admins podem atualizar perfis" 
ON user_profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- POLÍTICAS PARA OUTRAS TABELAS
-- ============================================

-- Personnel: Leitura pública, escrita para autenticados
CREATE POLICY "Permitir leitura pública de personnel" 
ON personnel FOR SELECT 
USING (true);

CREATE POLICY "Permitir escrita para autenticados em personnel" 
ON personnel FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- Vehicles: Leitura pública, escrita para autenticados
CREATE POLICY "Permitir leitura pública de vehicles" 
ON vehicles FOR SELECT 
USING (true);

CREATE POLICY "Permitir escrita para autenticados em vehicles" 
ON vehicles FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- Operational Teams: Leitura pública, escrita para autenticados
CREATE POLICY "Permitir leitura pública de operational_teams" 
ON operational_teams FOR SELECT 
USING (true);

CREATE POLICY "Permitir escrita para autenticados em operational_teams" 
ON operational_teams FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'viewer')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
