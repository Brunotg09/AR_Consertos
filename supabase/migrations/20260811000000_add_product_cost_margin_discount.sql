-- ============================================================
-- MIGRATION: Add cost_price, margin_percentage, discount_percentage to products
-- Also add start_date to orders for editable start date feature
-- ============================================================

-- Add cost and margin columns to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_percentage int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_percentage int DEFAULT 0;

-- Add start_date to orders table (editable by admin, pre-filled with current date)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS start_date timestamptz DEFAULT now();
