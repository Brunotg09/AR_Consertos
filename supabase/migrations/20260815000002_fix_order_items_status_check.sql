-- Fix order_items status CHECK constraint to match the full workflow statuses

ALTER TABLE IF EXISTS order_items DROP CONSTRAINT IF EXISTS order_items_status_check;

ALTER TABLE IF EXISTS order_items
ADD CONSTRAINT order_items_status_check
CHECK (status IN (
  'pendente',
  'aguardando_orcamento',
  'orcamento_enviado',
  'confirmado',
  'em_andamento',
  'pronta',
  'entregue',
  'concluido',
  'cancelado'
));
