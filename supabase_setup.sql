-- SCRIPT PARA SUPABASE (POSTGRESQL)
-- Aplicativo: Facilitou

-- 1. Tabela de Perfis de Usuários
-- Observação: No Supabase, geralmente ligamos isto à tabela 'auth.users'
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  province TEXT,
  municipality TEXT,
  gender TEXT CHECK (gender IN ('MASCULINO', 'FEMININO', 'OUTRO')),
  description TEXT,
  avatar_url TEXT,
  type TEXT DEFAULT 'CLIENT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Serviços (Anúncios)
CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price TEXT,
  location TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Mensagens (Chat)
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Função para atualizar o timestamp de 'updated_at' automaticamente
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- 5. Configurar Row Level Security (RLS) - Básico
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Exemplo de Política: Qualquer um pode ver serviços
CREATE POLICY "Serviços são públicos" ON services FOR SELECT USING (true);
CREATE POLICY "Usuários podem criar serviços" ON services FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Exemplo de Política: Mensagens privadas
CREATE POLICY "Ver mensagens próprias" ON messages FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
