-- Add new order statuses and protect finalized orders from deletion
-- New statuses: aguardando_orcamento, orcamento_enviado, pronta, entregue

-- ============================================================
-- 1. Add new statuses to orders table CHECK constraint
-- ============================================================

-- Drop the existing CHECK constraint
ALTER TABLE IF EXISTS orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add updated CHECK constraint with new statuses
-- New workflow: pendente -> aguardando_orcamento -> orcamento_enviado -> confirmado -> em_andamento -> pronta -> entregue -> concluido
-- Cancelamento pode acontecer em qualquer fase
ALTER TABLE IF EXISTS orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'pendente',
  'confirmado',
  'em_andamento',
  'concluido',
  'cancelado',
  'aguardando_orcamento',
  'orcamento_enviado',
  'pronta',
  'entregue'
));

-- ============================================================
-- 2. Update delete_order_with_items to prevent deletion of finalized orders
-- ============================================================
DROP FUNCTION IF EXISTS public.delete_order_with_items(uuid);
CREATE OR REPLACE FUNCTION public.delete_order_with_items(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status text;
BEGIN
  -- Check current status
  SELECT status INTO v_status FROM public.orders WHERE id = p_order_id;
  
  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;
  
  -- Block deletion of finalized orders
  IF v_status IN ('concluido', 'cancelado', 'pronta', 'entregue') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é possível excluir um pedido com status: ' || v_status);
  END IF;
  
  -- Safe to delete
  DELETE FROM public.order_items WHERE order_id = p_order_id;
  DELETE FROM public.orders WHERE id = p_order_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_order_with_items(uuid) TO authenticated;