-- ==============================================================================
-- VCUBE 3D & CAD CATALOG MIGRATION
-- Table: public.products
-- Security: Row Level Security (RLS) for Public vs Admin
-- Storage: 'product-images' (Public) & 'cad-files' (Restricted)
-- ==============================================================================

-- 1. Create Status Enum if not exists
DO $$ BEGIN
    CREATE TYPE public.product_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'mechanical',
    designer TEXT NOT NULL DEFAULT 'VCUBE Engineering Team',
    price_physical NUMERIC NOT NULL DEFAULT 0,
    price_digital NUMERIC NOT NULL DEFAULT 0,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    thumbnail_url TEXT,
    cad_file_url TEXT,
    cad_format TEXT DEFAULT 'STL',
    file_size_bytes BIGINT DEFAULT 0,
    description TEXT,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    supported_materials JSONB NOT NULL DEFAULT '["PLA Tough"]'::jsonb,
    colors JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    badge TEXT,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    prints_count INT DEFAULT 0,
    print_time TEXT DEFAULT '2h',
    is_customizable BOOLEAN DEFAULT false,
    license_type TEXT DEFAULT 'Commercial',
    status TEXT NOT NULL DEFAULT 'published',
    production_readiness TEXT DEFAULT 'ready_to_print',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_price_physical ON public.products(price_physical);
CREATE INDEX IF NOT EXISTS idx_products_tags ON public.products USING GIN (tags);

-- Full-Text Search GIN Index
CREATE INDEX IF NOT EXISTS idx_products_fts ON public.products USING GIN (
    to_tsvector('simple', 
        coalesce(name, '') || ' ' || 
        coalesce(sku, '') || ' ' || 
        coalesce(designer, '') || ' ' || 
        coalesce(description, '')
    )
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to allow clean idempotent re-runs
DROP POLICY IF EXISTS "Public read published products" ON public.products;
DROP POLICY IF EXISTS "Admin full access" ON public.products;

-- Policy A: Public users (anon & authenticated) can ONLY view published products
CREATE POLICY "Public read published products"
ON public.products
FOR SELECT
USING (
    status = 'published' OR status = 'Published'
);

-- Policy B: Admins have full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admin full access"
ON public.products
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

-- 5. Setup Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('product-images', 'product-images', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
    ('cad-files', 'cad-files', false, 104857600, ARRAY['application/octet-stream', 'model/stl', 'model/step', 'application/zip'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

-- Storage Policies
DROP POLICY IF EXISTS "Public product-images read" ON storage.objects;
CREATE POLICY "Public product-images read"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin product-images write" ON storage.objects;
CREATE POLICY "Admin product-images write"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'product-images' AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
    )
)
WITH CHECK (
    bucket_id = 'product-images' AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
    )
);

DROP POLICY IF EXISTS "Admin cad-files write" ON storage.objects;
CREATE POLICY "Admin cad-files write"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'cad-files' AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
    )
)
WITH CHECK (
    bucket_id = 'cad-files' AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
    )
);
