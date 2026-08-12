-- Stock Management Functions Migration
-- Substitui as funções antigas managed_decrement_stock / managed_increment_stock
-- Adiciona validação de estoque, desativação automática, reserva atômica
-- Remove restrição de admin-only

-- ============================================================
-- 1. managed_decrement_stock — decrementa estoque com validação
-- Retorna: { success: boolean, stock: integer, error?: string }
-- ============================================================
DROP FUNCTION IF EXISTS public.managed_decrement_stock(integer, integer);
CREATE OR REPLACE FUNCTION public.managed_decrement_stock(product_id integer, qty integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_stock integer;
  v_new_stock integer;
BEGIN
  -- Lock da linha para evitar race condition
  SELECT stock INTO v_stock 
  FROM public.products 
  WHERE id = product_id 
  FOR UPDATE;
  
  IF v_stock IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Produto não encontrado');
  END IF;
  
  IF v_stock < qty THEN
    RETURN jsonb_build_object('success', false, 'error', 'Estoque insuficiente', 'stock', v_stock);
  END IF;
  
  v_new_stock := v_stock - qty;
  
  -- Decrementa e desativa se zerar
  UPDATE public.products 
  SET stock = v_new_stock,
      active = CASE WHEN v_new_stock <= 0 THEN false ELSE active END
  WHERE id = product_id;
  
  RETURN jsonb_build_object('success', true, 'stock', v_new_stock);
END;
$$;

-- ============================================================
-- 2. managed_increment_stock — incrementa estoque com reativação
-- Retorna: { success: boolean, stock: integer, error?: string }
-- ============================================================
DROP FUNCTION IF EXISTS public.managed_increment_stock(integer, integer);
CREATE OR REPLACE FUNCTION public.managed_increment_stock(product_id integer, qty integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_stock integer;
  v_new_stock integer;
BEGIN
  -- Lock da linha
  SELECT stock INTO v_stock 
  FROM public.products 
  WHERE id = product_id 
  FOR UPDATE;
  
  IF v_stock IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Produto não encontrado');
  END IF;
  
  v_new_stock := v_stock + qty;
  
  -- Incrementa e reativa se era zero
  UPDATE public.products 
  SET stock = v_new_stock,
      active = CASE WHEN v_new_stock > 0 THEN true ELSE active END
  WHERE id = product_id;
  
  RETURN jsonb_build_object('success', true, 'stock', v_new_stock);
END;
$$;

-- ============================================================
-- 3. reserve_stock — reserva atômica de múltiplos itens (para checkout)
-- items = [{product_id: 1, qty: 2}, {product_id: 2, qty: 1}, ...]
-- Retorna: { success: boolean, error?: string, product_id?: integer, available_stock?: integer }
-- Se falhar, faz rollback automático de todos os itens já decrementados
-- ============================================================
CREATE OR REPLACE FUNCTION public.reserve_stock(items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_i integer;
  v_items_count integer;
  v_product_id integer;
  v_qty integer;
  v_result jsonb;
  v_reserved_produtos integer[] := '{}';
  v_reserved_qtys integer[] := '{}';
  v_reserved_count integer := 0;
BEGIN
  IF items IS NULL OR jsonb_typeof(items) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Items deve ser um array JSON');
  END IF;
  
  v_items_count := jsonb_array_length(items);
  
  IF v_items_count = 0 THEN
    RETURN jsonb_build_object('success', true);
  END IF;
  
  -- Processa todos os itens
  FOR v_i IN 0..v_items_count - 1
  LOOP
    v_product_id := (items->v_i->>'product_id')::integer;
    v_qty := (items->v_i->>'qty')::integer;
    
    IF v_product_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      -- Rollback: restaura itens já decrementados
      IF v_reserved_count > 0 THEN
        FOR v_i IN 0..v_reserved_count - 1
        LOOP
          PERFORM public.managed_increment_stock(v_reserved_produtos[v_i + 1], v_reserved_qtys[v_i + 1]);
        END LOOP;
      END IF;
      RETURN jsonb_build_object('success', false, 'error', 'Item inválido: product_id e qty são obrigatórios');
    END IF;
    
    -- Tenta decrementar
    v_result := public.managed_decrement_stock(v_product_id, v_qty);
    
    IF NOT (v_result->>'success')::boolean THEN
      -- Rollback: restaura itens já decrementados nesta transação
      IF v_reserved_count > 0 THEN
        FOR v_i IN 0..v_reserved_count - 1
        LOOP
          PERFORM public.managed_increment_stock(v_reserved_produtos[v_i + 1], v_reserved_qtys[v_i + 1]);
        END LOOP;
      END IF;
      
      RETURN jsonb_build_object(
        'success', false, 
        'error', v_result->>'error',
        'product_id', v_product_id,
        'available_stock', v_result->>'stock'
      );
    END IF;
    
    -- Track successful reservation for potential rollback
    v_reserved_count := v_reserved_count + 1;
    v_reserved_produtos[v_reserved_count] := v_product_id;
    v_reserved_qtys[v_reserved_count] := v_qty;
  END LOOP;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 4. release_stock — libera estoque previamente reservado
-- Usado quando checkout falha após reserve_stock ter sucesso
-- ============================================================
CREATE OR REPLACE FUNCTION public.release_stock(items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_i integer;
  v_items_count integer;
  v_product_id integer;
  v_qty integer;
BEGIN
  IF items IS NULL OR jsonb_typeof(items) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Items deve ser um array JSON');
  END IF;
  
  v_items_count := jsonb_array_length(items);
  
  FOR v_i IN 0..v_items_count - 1
  LOOP
    v_product_id := (items->v_i->>'product_id')::integer;
    v_qty := (items->v_i->>'qty')::integer;
    
    IF v_product_id IS NOT NULL AND v_qty IS NOT NULL AND v_qty > 0 THEN
      PERFORM public.managed_increment_stock(v_product_id, v_qty);
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 4. Permissões — remover restrição de admin, permitir authenticated
-- ============================================================
GRANT EXECUTE ON FUNCTION public.managed_decrement_stock(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.managed_increment_stock(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_stock(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_stock(jsonb) TO authenticated;

-- ============================================================
-- 5. Índice para consultas de estoque
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_stock_active 
ON public.products (stock, active) 
WHERE active = true;