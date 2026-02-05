-- ============================================
-- MIGRAÇÃO: Sistema de Autenticação
-- Descrição: Cria tabela de perfis de usuários e políticas de segurança
-- ============================================

-- 1. Criar tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

-- 3. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Criar trigger para atualizar updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Criar função para criar perfil automaticamente quando novo usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Habilitar Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 8. Políticas de Segurança

-- Política: Usuários autenticados podem ver todos os perfis
DROP POLICY IF EXISTS "Usuários autenticados podem ver perfis" ON user_profiles;
CREATE POLICY "Usuários autenticados podem ver perfis" 
ON user_profiles FOR SELECT 
TO authenticated
USING (true);

-- Política: Apenas admins podem inserir novos perfis
DROP POLICY IF EXISTS "Apenas admins podem inserir perfis" ON user_profiles;
CREATE POLICY "Apenas admins podem inserir perfis" 
ON user_profiles FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  )
);

-- Política: Apenas admins podem atualizar perfis
DROP POLICY IF EXISTS "Apenas admins podem atualizar perfis" ON user_profiles;
CREATE POLICY "Apenas admins podem atualizar perfis" 
ON user_profiles FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  )
);

-- Política: Apenas admins podem deletar perfis
DROP POLICY IF EXISTS "Apenas admins podem deletar perfis" ON user_profiles;
CREATE POLICY "Apenas admins podem deletar perfis" 
ON user_profiles FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  )
);

-- 9. Atualizar políticas das tabelas existentes para verificar autenticação real

-- Personnel: Apenas usuários autenticados com role admin ou editor podem modificar
DROP POLICY IF EXISTS "Permitir tudo com anon key" ON personnel;
CREATE POLICY "Autenticados podem modificar personnel" 
ON personnel FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'editor') 
    AND is_active = true
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'editor') 
    AND is_active = true
  )
);

-- Vehicles: Apenas usuários autenticados com role admin ou editor podem modificar
DROP POLICY IF EXISTS "Permitir tudo com anon key" ON vehicles;
CREATE POLICY "Autenticados podem modificar vehicles" 
ON vehicles FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'editor') 
    AND is_active = true
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'editor') 
    AND is_active = true
  )
);

-- Operational Teams: Apenas usuários autenticados com role admin ou editor podem modificar
DROP POLICY IF EXISTS "Permitir tudo com anon key" ON operational_teams;
CREATE POLICY "Autenticados podem modificar operational_teams" 
ON operational_teams FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'editor') 
    AND is_active = true
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'editor') 
    AND is_active = true
  )
);

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================

-- INSTRUÇÕES PARA EXECUTAR:
-- 1. Acesse https://app.supabase.com
-- 2. Selecione seu projeto
-- 3. Vá em "SQL Editor"
-- 4. Cole este script completo
-- 5. Clique em "Run"
-- 6. Verifique se não há erros
