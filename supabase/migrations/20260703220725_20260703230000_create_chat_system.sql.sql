/*
# Tabelas para o sistema de chat híbrido (IA + Admin)

1. chat_sessions - Sessões de chat dos usuários
2. chat_messages - Mensagens trocadas na sessão
*/

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'bot' CHECK (status IN ('bot', 'aguardando_admin', 'com_admin', 'encerrado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user', 'bot', 'admin')),
  content text NOT NULL,
  read_by_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for users (own sessions only)
DROP POLICY IF EXISTS "user_select_own_session" ON chat_sessions;
CREATE POLICY "user_select_own_session" ON chat_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_insert_own_session" ON chat_sessions;
CREATE POLICY "user_insert_own_session" ON chat_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_update_own_session" ON chat_sessions;
CREATE POLICY "user_update_own_session" ON chat_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_select_own_messages" ON chat_messages;
CREATE POLICY "user_select_own_messages" ON chat_messages FOR SELECT
  TO authenticated USING (
    session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "user_insert_own_messages" ON chat_messages;
CREATE POLICY "user_insert_own_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (
    session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid())
  );

-- Policies for admin (full access)
DROP POLICY IF EXISTS "admin_sessions_all" ON chat_sessions;
CREATE POLICY "admin_sessions_all" ON chat_sessions FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM user_private WHERE id = auth.uid()));

DROP POLICY IF EXISTS "admin_messages_all" ON chat_messages;
CREATE POLICY "admin_messages_all" ON chat_messages FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM user_private WHERE id = auth.uid()));

-- Function to auto-return to bot after 5 minutes
CREATE OR REPLACE FUNCTION check_session_timeout()
RETURNS void AS $$
BEGIN
  UPDATE chat_sessions
  SET status = 'bot', updated_at = now()
  WHERE status = 'aguardando_admin'
    AND updated_at < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at on message insert
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS trigger AS $$
BEGIN
  UPDATE chat_sessions SET updated_at = now() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_message_update_session ON chat_messages;
CREATE TRIGGER on_message_update_session
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_timestamp();

GRANT EXECUTE ON FUNCTION check_session_timeout() TO authenticated;
