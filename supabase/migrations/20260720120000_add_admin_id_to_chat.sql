-- Adicionar admin_id na tabela de sessões (qual admin está atendendo)
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES profiles(id);

-- Adicionar admin_id na tabela de mensagens (qual admin enviou cada msg)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES profiles(id);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_admin_id ON chat_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_admin_id ON chat_messages(admin_id);
