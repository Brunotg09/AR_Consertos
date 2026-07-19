-- Enable pg_cron extension (required for scheduled jobs)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

-- Grant usage to postgres (required for pg_cron)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Auto-close inactive sessions (48h) and delete old sessions (7 days)

-- Function: auto_close_inactive_sessions
-- Encerra sessões sem mensagem há 48 horas e insere mensagem do bot
CREATE OR REPLACE FUNCTION auto_close_inactive_sessions()
RETURNS void AS $$
DECLARE
  session_record RECORD;
BEGIN
  FOR session_record IN
    SELECT id FROM chat_sessions
    WHERE status IN ('bot', 'aguardando_admin')
      AND updated_at < now() - interval '48 hours'
  LOOP
    -- Insert bot message before closing
    INSERT INTO chat_messages (session_id, sender, content)
    VALUES (
      session_record.id,
      'bot',
      'Atendimento encerrado por inatividade. Se precisar, inicie uma nova conversa.'
    );

    -- Close the session
    UPDATE chat_sessions
    SET status = 'encerrado', updated_at = now()
    WHERE id = session_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: delete_old_sessions
-- Deleta sessões encerradas há mais de 3 dias (CASCADE delete das mensagens)
CREATE OR REPLACE FUNCTION delete_old_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_sessions
  WHERE status = 'encerrado'
    AND updated_at < now() - interval '3 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service_role (for pg_cron)
GRANT EXECUTE ON FUNCTION auto_close_inactive_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION delete_old_sessions() TO service_role;

-- pg_cron jobs
-- Run auto_close every hour
SELECT cron.schedule(
  'chat-auto-close-inactive',
  '0 * * * *',
  'SELECT auto_close_inactive_sessions()'
);

-- Run delete_old once a day at 3am
SELECT cron.schedule(
  'chat-delete-old-sessions',
  '0 3 * * *',
  'SELECT delete_old_sessions()'
);
