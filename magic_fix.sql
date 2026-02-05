-- =========================================================
-- SCRIPT MÁGICO: CORREÇÃO TOTAL (Triggers + Usuário)
-- =========================================================

-- 1. REMOVER A AUTOMAÇÃO QUEBRADA (Causa do Erro 500)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Limpar usuário antigo (para recriar do zero)
DELETE FROM auth.users WHERE email = 'gabrielnovacoski@gmail.com';
DELETE FROM public.user_profiles WHERE email = 'gabrielnovacoski@gmail.com';

-- 3. Habilitar criptografia de senha
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4. CRIAR USUÁRIO NOVO (Senha: senha123)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, 
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
  created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- ID FIXO
  'authenticated',
  'authenticated',
  'gabrielnovacoski@gmail.com',
  crypt('senha123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Gabriel Novacoski"}',
  now(),
  now(),
  '', '', '', ''
);

-- 5. CRIAR PERFIL DE ADMIN
INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
  'gabrielnovacoski@gmail.com', 
  'Gabriel Novacoski', 
  'admin', 
  true
);

-- 6. GARANTIR PERMISSÃO DE LEITURA
DROP POLICY IF EXISTS "Todos podem ver perfis" ON public.user_profiles;
CREATE POLICY "Todos podem ver perfis" ON public.user_profiles FOR SELECT USING (true);
