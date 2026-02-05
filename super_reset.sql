-- ===================================================
-- SUPER RESET SCRIPT - CORREÇÃO DEFINITIVA
-- ===================================================

-- 1. Limpeza total (Cuidado: apaga todos os usuários)
-- Se der erro de violação, tente rodar as linhas separadamente
DELETE FROM auth.users WHERE email = 'gabrielnovacoski@gmail.com';
DELETE FROM public.user_profiles WHERE email = 'gabrielnovacoski@gmail.com';

-- 2. Habilitar criptografia
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Inserir Usuário com ID FIXO e senha 'senha123'
-- Usamos um ID conhecido para garantir que o perfil conecte corretamente
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, 
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000', 
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- ID FIXO
  'authenticated', 'authenticated', 
  'gabrielnovacoski@gmail.com', 
  crypt('senha123', gen_salt('bf')), 
  now(), '{"full_name":"Gabriel Novacoski"}', now(), now(),
  '', '', '', ''
);

-- 4. Inserir Perfil com o MESMO ID FIXO manualmente
INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- MESMO ID FIXO
  'gabrielnovacoski@gmail.com', 
  'Gabriel Novacoski', 
  'admin', 
  true
)
ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true;

-- 5. Garantir que todos podem ver (Correção do Loop da tela inicial)
DROP POLICY IF EXISTS "Todos podem ver perfis" ON public.user_profiles;
CREATE POLICY "Todos podem ver perfis" ON public.user_profiles FOR SELECT USING (true);
