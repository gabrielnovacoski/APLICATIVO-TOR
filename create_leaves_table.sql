-- Tabela de Afastamentos
CREATE TABLE IF NOT EXISTS personnel_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Férias', 'Licença', 'Atestado', 'Outro')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  observation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE personnel_leaves ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
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
