-- ============================================================
-- PARTE 1: TABELAS (execute esta primeiro)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text NOT NULL,
  phone text,
  birth_date date,
  avatar_url text,
  address jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_private (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clientes (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  telefone text,
  email text,
  cpf text,
  endereco jsonb,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id serial PRIMARY KEY,
  name text NOT NULL,
  category text,
  description text,
  price decimal(10,2) NOT NULL,
  stock int DEFAULT 0,
  condition text CHECK (condition IN ('novo', 'usado', 'recondicionado')),
  images text[],
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id int REFERENCES clientes(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'em_andamento', 'concluido', 'cancelado')),
  payment_method text CHECK (payment_method IN ('dinheiro', 'pix', 'cartao')),
  payment_confirmed boolean DEFAULT false,
  total decimal(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id serial PRIMARY KEY,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('servico', 'produto')),
  item_id text NOT NULL,
  item_name text NOT NULL,
  service_type text CHECK (service_type IN ('convencional', 'inverter')),
  quantity int DEFAULT 1,
  price decimal(10,2),
  payment_method text CHECK (payment_method IN ('dinheiro', 'pix', 'cartao')),
  payment_status text DEFAULT 'pendente' CHECK (payment_status IN ('pendente', 'pago_parcial', 'pago', 'cancelado')),
  payments jsonb DEFAULT '[]',
  amount_paid decimal(10,2) DEFAULT 0,
  scheduled_date timestamptz,
  problem_description text,
  diagnosis text,
  completed_at timestamptz,
  warranty_expires_at timestamptz,
  product_category text,
  product_condition text CHECK (product_condition IN ('novo', 'usado', 'recondicionado')),
  product_images text[]
);

CREATE TABLE IF NOT EXISTS banners (
  id serial PRIMARY KEY,
  title text,
  subtitle text,
  image_url text NOT NULL,
  link text,
  active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hidden_services (
  id serial PRIMARY KEY,
  service_id text NOT NULL UNIQUE,
  hidden_at timestamptz DEFAULT now()
);

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
