/*
# Funções RPC para controle de estoque

1. Decrementa estoque (usado ao confirmar pedido com produto)
2. Incrementa estoque (usado ao cancelar pedido com produto)
*/

CREATE OR REPLACE FUNCTION decrement_stock(product_id int, qty int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products SET stock = stock - qty WHERE id = product_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_stock(product_id int, qty int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products SET stock = stock + qty WHERE id = product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION decrement_stock(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_stock(int, int) TO authenticated;
