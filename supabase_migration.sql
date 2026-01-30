
-- Tabela de Efetivo
CREATE TABLE IF NOT EXISTS personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  graduation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Viaturas
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  prefix TEXT,
  model TEXT,
  year TEXT,
  plate TEXT,
  odometer INTEGER DEFAULT 0,
  oil_interval INTEGER DEFAULT 10000,
  last_oil_change_odometer INTEGER DEFAULT 0,
  color TEXT,
  status TEXT DEFAULT 'OPERANDO',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Equipes/Escalas
CREATE TABLE IF NOT EXISTS operational_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vehicle_id TEXT REFERENCES vehicles(id),
  members JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_teams ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (Leitura)
CREATE POLICY "Permitir leitura pública" ON personnel FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública" ON vehicles FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública" ON operational_teams FOR SELECT USING (true);

-- Políticas de acesso para autenticados (Escrita/Edição)
-- Como o usuário quer simplicidade, vamos permitir anon_key editar se o usuário assim desejar, 
-- mas o ideal é uso de Service Role ou Autenticação. 
-- Por enquanto, para funcionar de imediato com a anon_key:
CREATE POLICY "Permitir tudo com anon key" ON personnel FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo com anon key" ON vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo com anon key" ON operational_teams FOR ALL USING (true) WITH CHECK (true);
