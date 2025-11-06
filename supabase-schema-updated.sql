-- ============================================
-- SCHEMA ATUALIZADO - ChatIA RAG
-- Sistema de autenticação + Conversas + Anexos
-- ============================================

-- 1. Tabela de usuários (apenas 1 usuário permitido)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Índice para busca rápida por email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Tabela de configurações (agora vinculada ao usuário)
DROP TABLE IF EXISTS configs CASCADE;
CREATE TABLE configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  openrouter_api_key VARCHAR(255),
  model VARCHAR(100) DEFAULT 'openai/gpt-4-turbo',
  system_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Tabela de conversas (novo!)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'archived')),
  sender_id VARCHAR(50), -- WhatsApp ID ou 'local'
  sender_name VARCHAR(255),
  message_count INTEGER DEFAULT 0,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para conversas
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_sender_id ON conversations(sender_id);

-- 4. Tabela de documentos (agora pode ser anexado a conversas)
DROP TABLE IF EXISTS documents CASCADE;
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  filetype VARCHAR(100) NOT NULL,
  filesize INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_filetype CHECK (filetype IN ('application/pdf', 'text/plain', 'text/markdown'))
);

-- Índices para documentos
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_conversation_id ON documents(conversation_id);

-- 5. Tabela de embeddings (atualizada)
DROP TABLE IF EXISTS embeddings CASCADE;
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice vetorial para busca semântica
CREATE INDEX IF NOT EXISTS idx_embeddings_vector 
  ON embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 6. Tabela de mensagens (atualizada com conversation_id e rating)
DROP TABLE IF EXISTS messages CASCADE;
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  model VARCHAR(100),
  sources JSONB,
  rating VARCHAR(10) CHECK (rating IN ('up', 'down', '1', '2', '3', '4', '5')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mensagens
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- 7. Função de busca semântica (atualizada)
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_user_id UUID DEFAULT NULL,
  filter_conversation_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_text TEXT,
  similarity FLOAT,
  filename VARCHAR(255),
  conversation_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.document_id,
    e.chunk_text,
    1 - (e.embedding <=> query_embedding) AS similarity,
    d.filename,
    d.conversation_id
  FROM embeddings e
  JOIN documents d ON e.document_id = d.id
  WHERE 
    1 - (e.embedding <=> query_embedding) > match_threshold
    AND (filter_user_id IS NULL OR d.user_id = filter_user_id)
    AND (filter_conversation_id IS NULL OR d.conversation_id = filter_conversation_id)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 8. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas relevantes
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configs_updated_at ON configs;
CREATE TRIGGER update_configs_updated_at BEFORE UPDATE ON configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Trigger para atualizar contador de mensagens
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    message_count = (SELECT COUNT(*) FROM messages WHERE conversation_id = NEW.conversation_id),
    last_message = NEW.content,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversation_stats_trigger ON messages;
CREATE TRIGGER update_conversation_stats_trigger 
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();

-- 10. Política RLS (Row Level Security)
-- DESABILITADO porque usamos service_role key no backend
-- O backend faz toda a validação de permissões via JWT
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings DISABLE ROW LEVEL SECURITY;

-- 11. Criar usuário padrão DEMO (OPCIONAL - pode deletar depois)
-- Senha padrão: 'admin123' (hash bcrypt)
-- IMPORTANTE: Este é apenas um usuário de demonstração
-- Os usuários reais devem se registrar pelo sistema
INSERT INTO users (email, password_hash, name)
VALUES (
  'admin@chatia.local',
  '$2b$10$Zv7Wsy3hDjlSXeK23P0rF.phkHFjaSfmkbqL1EiqITt20Z7.RzHA.',
  'Admin Demo'
)
ON CONFLICT (email) DO NOTHING;

-- 12. Views úteis para métricas
CREATE OR REPLACE VIEW conversation_metrics AS
SELECT 
  c.id,
  c.title,
  c.status,
  c.message_count,
  c.created_at,
  COUNT(DISTINCT d.id) as document_count,
  AVG(CASE 
    WHEN m.rating IN ('1','2','3','4','5') THEN m.rating::INTEGER
    ELSE NULL 
  END) as avg_rating
FROM conversations c
LEFT JOIN documents d ON d.conversation_id = c.id
LEFT JOIN messages m ON m.conversation_id = c.id AND m.role = 'assistant'
GROUP BY c.id, c.title, c.status, c.message_count, c.created_at;

-- ============================================
-- MIGRATION NOTES:
-- 1. Execute este schema em ordem
-- 2. Migre dados antigos se necessário
-- 3. Altere a senha padrão do usuário admin
-- 4. Configure RLS conforme necessidade
-- ============================================
