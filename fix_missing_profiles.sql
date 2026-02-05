-- ============================================
-- FIX: Corrigir Perfis de Usuário Faltantes
-- Descrição: Insere perfis para usuários que existem no Auth mas não na tabela de perfis
-- ============================================

-- 1. Inserir perfis faltantes baseados nos usuários já cadastrados
INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', 'Administrador'), 
  COALESCE(raw_user_meta_data->>'role', 'admin'), 
  true
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles);

-- 2. Garantir que o trigger está funcionando para o futuro
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Verificação
SELECT count(*) as total_perfis FROM public.user_profiles;
