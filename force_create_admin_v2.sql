-- ==========================================
-- FORÇAR CRIAÇÃO DE ADMIN (Bypass Rate Limit)
-- ==========================================

-- 1. Garante que pgcrypto está ativo
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Limpar tentativas anteriores (Garante estado limpo)
DELETE FROM auth.users WHERE email = 'gabrielnovacoski@gmail.com';
DELETE FROM public.user_profiles WHERE email = 'gabrielnovacoski@gmail.com';

-- 3. Inserir Usuário manualmente com ID FIXO
-- SENHA: senha123
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

-- 4. Inserir Perfil manualmente (Já que removemos a trigger automática)
INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- MESMO ID FIXO
  'gabrielnovacoski@gmail.com', 
  'Gabriel Novacoski', 
  'admin', 
  true
);
