-- Add status column to order_items for per-item status tracking
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'em_andamento', 'concluido', 'cancelado'));

-- Backfill: set status based on completed_at
UPDATE order_items SET status = 'concluido' WHERE completed_at IS NOT NULL AND status = 'pendente';
UPDATE order_items SET status = 'em_andamento' WHERE diagnosis IS NOT NULL AND completed_at IS NULL AND status = 'pendente';
