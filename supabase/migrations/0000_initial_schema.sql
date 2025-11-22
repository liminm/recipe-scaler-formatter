-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Events
create table events (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  total_headcount integer not null,
  target_weight_per_person_g numeric not null, -- Decimal
  equipment_profile jsonb not null default '{}'::jsonb,
  dietary_tags text[] not null default '{}',
  version_id uuid not null default uuid_generate_v4(),
  created_at timestamptz not null default now()
);

-- Recipes
create table recipes (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  source_url text,
  original_yield_servings numeric,
  chefs_notes text[] default '{}',
  is_base_module boolean default true,
  variant_of_id uuid references recipes(id),
  version_id uuid not null default uuid_generate_v4(),
  created_at timestamptz not null default now()
);

-- Ingredients
create table ingredients (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid references recipes(id) on delete cascade,
  name_raw text not null,
  name_normalized text not null,
  base_quantity_g numeric not null,
  yield_factor numeric default 1,
  is_discrete boolean default false,
  purchase_unit text,
  role text not null, -- enum
  dependency_role text not null, -- enum
  is_high_potency boolean default false,
  is_high_sodium boolean default false,
  aisle_category text,
  prep_type text,
  state text, -- enum
  density_g_ml numeric
);

-- Steps
create table steps (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid references recipes(id) on delete cascade,
  "order" integer not null,
  instruction_raw text not null,
  instruction_normalized text not null,
  time_estimate_minutes numeric,
  constraint_tags text[] default '{}',
  ingredients_referenced uuid[] default '{}'
);

-- Recipe Instances (Menu)
create table recipe_instances (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade,
  base_recipe_id uuid references recipes(id),
  role text not null, -- enum
  target_per_person_g numeric,
  target_total_mass_g numeric,
  target_menu_percentage numeric,
  variant_headcount integer,
  scaled_total_mass_g numeric,
  scale_factor numeric
);
