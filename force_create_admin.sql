-- ==========================================
-- FORÇAR CRIAÇÃO DE ADMIN (Bypass Rate Limit)
-- ==========================================

-- 1. Garante que pgcrypto está ativo (para criptografar senha)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Remove qualquer tentativa anterior falha
DELETE FROM auth.users WHERE email = 'gabrielnovacoski@gmail.com';

-- 3. Insere o usuário manualmente na tabela de autenticação
-- A SENHA SERÁ: senha123
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'gabrielnovacoski@gmail.com',
  crypt('senha123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Gabriel Novacoski"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- 4. Garante que o perfil existe (caso o trigger falhe)
INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
SELECT id, email, 'Gabriel Novacoski', 'admin', true
FROM auth.users
WHERE email = 'gabrielnovacoski@gmail.com'
ON CONFLICT (id) DO NOTHING;
