-- LIBERAR VISUALIZAÇÃO DE PERFIS
-- O problema é que o aplicativo não consegue "ver" que o admin existe porque o banco está bloqueado para quem não está logado.
-- Este comando permite que o aplicativo verifique a contagem de usuários.

DROP POLICY IF EXISTS "Usuários autenticados podem ver perfis" ON public.user_profiles;

CREATE POLICY "Todos podem ver perfis" 
ON public.user_profiles 
FOR SELECT 
USING (true);
