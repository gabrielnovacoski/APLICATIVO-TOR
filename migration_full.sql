-- ==============================================================================
-- MIGRATION FULL V2: CORREÇÃO GERAL E NOVAS FUNCIONALIDADES (AFASTAMENTOS)
-- ==============================================================================

-- 0. GARANTIR A MESA DE PERFIS (User Profiles)
-- Isso corrige o erro "relation user_profiles does not exist"
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS em Profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de Profiles (para garantir acesso)
DROP POLICY IF EXISTS "Usuários autenticados podem ver perfis" ON user_profiles;
CREATE POLICY "Usuários autenticados podem ver perfis" ON user_profiles FOR SELECT TO authenticated USING (true);


-- 1. Criação/Correção da Tabela de Afastamentos (Personnel Leaves)
CREATE TABLE IF NOT EXISTS personnel_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Férias', 'Licença', 'Atestado', 'Outro')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  observation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS para Afastamentos
ALTER TABLE personnel_leaves ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança para Afastamentos
DROP POLICY IF EXISTS "Permitir leitura pública" ON personnel_leaves;
CREATE POLICY "Permitir leitura pública" ON personnel_leaves FOR SELECT USING (true);

DROP POLICY IF EXISTS "Autenticados podem modificar folhas" ON personnel_leaves;
CREATE POLICY "Autenticados podem modificar folhas" 
ON personnel_leaves FOR ALL 
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

-- ==============================================================================
-- CORREÇÕES DE AUTH E PERFIS (Garante que admins consigam editar)
-- ==============================================================================

-- 4. Função para garantir que todo usuário Auth tenha um User Profile
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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recriar Trigger de Novos Usuários
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Forçar criação de perfis para usuários que já existem mas estão sem perfil
INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', 'Usuário Recuperado'), 
    'admin', 
    true
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;

-- 7. Atualizar Políticas das Outras Tabelas (Garante acesso ao Admin)
DROP POLICY IF EXISTS "Permitir tudo com anon key" ON personnel;
DROP POLICY IF EXISTS "Autenticados podem modificar personnel" ON personnel;
CREATE POLICY "Autenticados podem modificar personnel" 
ON personnel FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor') AND is_active = true));

DROP POLICY IF EXISTS "Permitir tudo com anon key" ON vehicles;
DROP POLICY IF EXISTS "Autenticados podem modificar vehicles" ON vehicles;
CREATE POLICY "Autenticados podem modificar vehicles" 
ON vehicles FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor') AND is_active = true));

DROP POLICY IF EXISTS "Permitir tudo com anon key" ON operational_teams;
DROP POLICY IF EXISTS "Autenticados podem modificar operational_teams" ON operational_teams;
CREATE POLICY "Autenticados podem modificar operational_teams" 
ON operational_teams FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor') AND is_active = true));
