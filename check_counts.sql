-- Verificação de Contagens
-- Rode este script e veja os resultados nas abas "Results"

SELECT 'Usuários no Auth' as tabela, count(*) as total FROM auth.users
UNION ALL
SELECT 'Perfis Criados' as tabela, count(*) as total FROM public.user_profiles;
