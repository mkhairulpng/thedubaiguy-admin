CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT, subcategory TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0, badge TEXT, collection TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb, sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  colors JSONB NOT NULL DEFAULT '[]'::jsonb, lede TEXT, details TEXT, material TEXT,
  qty INTEGER NOT NULL DEFAULT 0, soldout BOOLEAN NOT NULL DEFAULT FALSE,
  clearance BOOLEAN NOT NULL DEFAULT FALSE, active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY, name TEXT NOT NULL, email TEXT, mobile TEXT, address TEXT, postal TEXT, country TEXT,
  total_spend NUMERIC(12,2) NOT NULL DEFAULT 0, order_count INTEGER NOT NULL DEFAULT 0,
  aura_member BOOLEAN NOT NULL DEFAULT FALSE, aura_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  aura_cashback_earned NUMERIC(12,2) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_idx ON customers ((LOWER(email))) WHERE email IS NOT NULL AND email <> '';
CREATE INDEX IF NOT EXISTS customers_mobile_idx ON customers (mobile);
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY, order_number TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  payment_status TEXT NOT NULL DEFAULT 'PENDING', stripe_session_id TEXT, stripe_payment_intent_id TEXT,
  customer_id UUID REFERENCES customers(id), customer_name TEXT NOT NULL, customer_email TEXT, customer_mobile TEXT,
  address TEXT, postal TEXT, country TEXT, subtotal NUMERIC(12,2) NOT NULL DEFAULT 0, shipping NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'SGD', payment_method TEXT, delivery_method TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb, lalamove_order_id TEXT, lalamove_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), paid_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders (customer_id);
CREATE TABLE IF NOT EXISTS aura_transactions (
  id UUID PRIMARY KEY, customer_id UUID NOT NULL REFERENCES customers(id), order_id UUID REFERENCES orders(id),
  amount NUMERIC(12,2) NOT NULL, type TEXT NOT NULL, note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS lalamove_events (
  id TEXT PRIMARY KEY, order_id TEXT, event_type TEXT, payload JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
