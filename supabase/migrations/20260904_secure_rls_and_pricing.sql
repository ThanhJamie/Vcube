-- ==============================================================================
-- VCUBE ADVANCED SECURITY & PRICING VERIFICATION MIGRATION
-- 1. Tighten RLS for products, orders, cost_rules
-- 2. Support Guest Checkout with secure_access_token
-- 3. Store Cryptographic Quotes to prevent price tampering
-- ==============================================================================

-- 1. Ensure Orders table exists with Guest Token support
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number TEXT,
    date TEXT,
    estimated_delivery TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    customer_name TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC NOT NULL,
    shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    shipping_fee NUMERIC DEFAULT 0,
    carrier JSONB,
    payment JSONB,
    status TEXT NOT NULL DEFAULT 'pending',
    status_stage_index INT DEFAULT 0,
    layer_progress INT DEFAULT 0,
    payment_method TEXT DEFAULT 'cod',
    payment_status TEXT DEFAULT 'unpaid',
    secure_access_token TEXT NOT NULL, -- Token for unauthenticated guest tracking
    quote_token JSONB,                 -- Cryptographic quote signature from Edge Function
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for Orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_secure_token ON public.orders(secure_access_token);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 3. Enable RLS on Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own orders" ON public.orders;
DROP POLICY IF EXISTS "Guests can read order with matching secure token" ON public.orders;
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins have full access to orders" ON public.orders;

-- Policy A: Authenticated user can read orders linked to their UID
CREATE POLICY "Users can read their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy B: Guests can read their specific order using secure_access_token
CREATE POLICY "Guests can read order with matching secure token"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (
    secure_access_token IS NOT NULL 
    AND secure_access_token = current_setting('request.headers', true)::json->>'x-order-token'
);

-- Policy C: Anyone (guest or logged-in) can create a new order
CREATE POLICY "Public can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy D: Admins have full access to all orders
CREATE POLICY "Admins have full access to orders"
ON public.orders
FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
)
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- 4. Cost Rules & Pricing Config RLS
CREATE TABLE IF NOT EXISTS public.cost_rules (
    id TEXT PRIMARY KEY,
    rule_name TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cost_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admin can view and modify cost rules" ON public.cost_rules;

CREATE POLICY "Only admin can view and modify cost rules"
ON public.cost_rules
FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
)
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

