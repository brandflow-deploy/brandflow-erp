-- ==============================================================================
-- BrandFlow ERP — Supabase PostgreSQL Schema
-- قم بنسخ هذا الملف وتشغيله في Supabase SQL Editor لإنشاء الجداول السحابية
-- ==============================================================================

-- 1. جدول البراندات (Brands)
create table if not exists public.brands (
  id text primary key,
  name text not null,
  code text not null,
  logo_color text not null default 'indigo',
  description text,
  default_customer_shipping numeric not null default 65,
  default_actual_shipping numeric not null default 55,
  is_active boolean not null default true,
  ai_import_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. جدول المنتجات والتصنيع والمخزون (Products)
create table if not exists public.products (
  id text primary key,
  brand_id text not null references public.brands(id) on delete cascade,
  name text not null,
  sku text,
  raw_material_cost numeric not null default 0,
  manufacturing_cost numeric not null default 0,
  default_selling_price numeric not null default 0,
  stock_quantity integer not null default 0,
  low_stock_threshold integer not null default 5,
  variants jsonb not null default '[]'::jsonb, -- متغيرات المقاس/اللون بمخزون مستقل
  category text,
  created_at timestamptz not null default now()
);

-- 3. جدول الأوردرات (Orders)
create table if not exists public.orders (
  id text primary key,
  order_number text not null unique,
  brand_id text not null references public.brands(id),
  brand_name text,
  customer_name text not null,
  customer_phone text not null,
  customer_phone_2 text,
  customer_address text not null,
  city text not null,
  items jsonb not null default '[]'::jsonb,
  items_subtotal numeric not null default 0,
  customer_shipping numeric not null default 0,
  total_amount numeric not null default 0,
  actual_shipping_cost numeric not null default 0,
  extra_expenses numeric not null default 0,
  total_raw_cost numeric not null default 0,
  total_manufacturing_cost numeric not null default 0,
  total_cost numeric not null default 0,
  net_profit numeric not null default 0,
  profit_margin numeric not null default 0,
  status text not null default 'manufacturing',
  inventory_deducted boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null,
  updated_by text
);

-- 4. جدول المستخدمين وصلاحيات الفريق (Team Users)
-- المصادقة عبر Supabase Auth؛ هذا الجدول يحمل الدور والصلاحيات فقط (بلا كلمات مرور)
create table if not exists public.team_users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'moderator', 'production', 'shipping', 'affiliate')),
  avatar text,
  is_active boolean not null default true,
  is_owner boolean not null default false,
  brands_access text[] not null default '{all}', -- '{all}' أو قائمة معرفات براندات محددة
  created_at timestamptz not null default now()
);

-- 5. جدول سجل العمليات والرقابة (Audit Logs)
create table if not exists public.audit_logs (
  id text primary key,
  timestamp timestamptz not null default now(),
  user_id text not null,
  user_name text not null,
  user_role text not null,
  action text not null,
  order_id text,
  order_number text,
  details text not null
);

-- فهارس لتحسين سرعة البحث والتصفية
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_brand on public.orders(brand_id);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_products_brand on public.products(brand_id);
create index if not exists idx_audit_logs_ts on public.audit_logs(timestamp desc);

-- ==============================================================================
-- سياسات الأمان (Row Level Security)
-- كل العمليات تتطلب مستخدماً مسجلاً ومفعّلاً في team_users.
-- المدير العام يرى ويفعل كل شيء؛ باقي الأدوار ترى فقط البراندات المحددة في brands_access.
-- ==============================================================================

-- دوال مساعدة (security definer لتفادي التكرار الذاتي في سياسات team_users)
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.team_users where id = auth.uid() and is_active = true
$$;

create or replace function public.current_user_brands_access()
returns text[]
language sql
security definer
stable
set search_path = public
as $$
  select brands_access from public.team_users where id = auth.uid() and is_active = true
$$;

create or replace function public.is_active_member()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.team_users where id = auth.uid() and is_active = true)
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.can_access_brand(brand text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case
    when public.current_user_role() = 'admin' then true
    else coalesce('all' = any(public.current_user_brands_access()) or brand = any(public.current_user_brands_access()), false)
  end
$$;

alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.team_users enable row level security;
alter table public.audit_logs enable row level security;

-- team_users: كل عضو مفعّل يقرأ الملفات (لعرض أسماء الفريق)، والإضافة/التعديل/الحذف للمدير فقط
create policy "members read team_users" on public.team_users
  for select using (public.is_active_member());
create or replace function public.team_users_empty()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (select 1 from public.team_users)
$$;

create policy "admin insert team_users" on public.team_users
  for insert with check (public.is_admin() or public.team_users_empty());
create policy "admin update team_users" on public.team_users
  for update using (public.is_admin());
create policy "admin delete team_users" on public.team_users
  for delete using (public.is_admin());

-- brands: القراءة والتعديل ضمن صلاحية البراندات المحددة للمستخدم؛ الحذف للمدير
create policy "members read allowed brands" on public.brands
  for select using (public.can_access_brand(id));
create policy "admin write brands" on public.brands
  for insert with check (public.is_admin());
create policy "admin update brands" on public.brands
  for update using (public.is_admin());
create policy "admin delete brands" on public.brands
  for delete using (public.is_admin());

-- products: القراءة ضمن صلاحية البراند؛ الإضافة والتعديل للمدير ومسؤول التصنيع؛ الحذف للمدير
create policy "members read products by brand" on public.products
  for select using (public.can_access_brand(brand_id));
create policy "admin or production write products" on public.products
  for insert with check (public.current_user_role() in ('admin', 'production') and public.can_access_brand(brand_id));
create policy "admin or production update products" on public.products
  for update using (public.current_user_role() in ('admin', 'production') and public.can_access_brand(brand_id));
create policy "admin delete products" on public.products
  for delete using (public.is_admin());

-- orders: القراءة والإنشاء والتعديل ضمن صلاحية البراند؛ الحذف للمدير فقط
create policy "members read orders by brand" on public.orders
  for select using (public.can_access_brand(brand_id));
create policy "members insert orders by brand" on public.orders
  for insert with check (public.can_access_brand(brand_id));
create policy "members update orders by brand" on public.orders
  for update using (public.can_access_brand(brand_id));
create policy "admin delete orders" on public.orders
  for delete using (public.is_admin());

-- audit_logs: القراءة للمدير فقط؛ الإضافة لأي عضو مفعّل
create policy "admin read audit_logs" on public.audit_logs
  for select using (public.is_admin());
create policy "members insert audit_logs" on public.audit_logs
  for insert with check (public.is_active_member());

-- ==============================================================================
-- تهيئة أول مرة: بعد إنشاء أول مستخدم من Supabase Dashboard
-- (Authentication > Users > Add user)، سجّل دخوله من التطبيق وسيصبح مالكاً
-- بصلاحية مدير عام تلقائياً (أول حساب فقط).
-- ==============================================================================
