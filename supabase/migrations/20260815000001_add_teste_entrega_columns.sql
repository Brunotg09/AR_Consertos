-- Add TESTE FINAL and ENTREGA DO EQUIPAMENTO columns to order_items

ALTER TABLE IF EXISTS order_items
ADD COLUMN IF NOT EXISTS teste_equipamento_ligado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS teste_funcao_principal boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS teste_funcoes_secundarias boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS teste_pecas_substituidas boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS teste_funcionando_normalmente boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS entrega_equipamento_entregue boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS entrega_acessorios_conferidos boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS entrega_equipamento_testado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS entrega_pagamento_registrado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS entrega_os_enviada boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS entrega_garantia_disponibilizada boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS entrega_data date,
ADD COLUMN IF NOT EXISTS entrega_hora time;
