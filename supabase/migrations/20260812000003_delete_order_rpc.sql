-- Função para deletar pedido + itens sem erro de trigger no item_id
CREATE OR REPLACE FUNCTION public.delete_order_with_items(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete order_items (bypassing problematic trigger by using direct DELETE)
  DELETE FROM public.order_items
  WHERE order_id = p_order_id;
  
  -- Delete the order
  DELETE FROM public.orders
  WHERE id = p_order_id;
END;
$$;

-- Permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION public.delete_order_with_items(uuid) TO authenticated;