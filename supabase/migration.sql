-- ─────────────────────────────────────────────────────────────
-- Expense Tracker – Supabase Schema
-- Run this entire file in the Supabase SQL Editor once.
-- ─────────────────────────────────────────────────────────────

-- ── OPERATIONAL TABLES ───────────────────────────────────────

create table if not exists user_settings (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  budget    integer not null default 30000,
  updated_at timestamptz default now()
);

create table if not exists people (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now()
);

-- expense group (e.g. "Groceries" with multiple entries underneath)
create table if not exists expenses (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  category   text not null default 'Other',
  month      text not null,   -- YYYY-MM
  from_wish  text,            -- wishlist item id if created from wish list
  created_at timestamptz default now()
);

-- individual transactions under an expense group
create table if not exists expense_entries (
  id         text primary key,
  expense_id text not null references expenses(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       text not null,   -- YYYY-MM-DD
  amount     numeric(12,2) not null check (amount > 0),
  note       text not null default '',
  paid_by    text,            -- person id (nullable)
  created_at timestamptz default now()
);

create table if not exists splits (
  expense_id text not null,
  person_id  text not null references people(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  amount     numeric(12,2) not null default 0,
  month      text not null,
  primary key (expense_id, person_id)
);

create table if not exists settlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  month   text not null,
  data    jsonb not null default '{}',
  primary key (user_id, month)
);

create table if not exists wishlist (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  cost       numeric(12,2) not null default 0,
  category   text not null default 'Other',
  type       text not null check (type in ('want','need')) default 'want',
  done       boolean not null default false,
  created_at timestamptz default now()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────

alter table user_settings   enable row level security;
alter table people          enable row level security;
alter table expenses        enable row level security;
alter table expense_entries enable row level security;
alter table splits          enable row level security;
alter table settlements     enable row level security;
alter table wishlist        enable row level security;

-- each user can only read/write their own rows
create policy "own data" on user_settings   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on people          for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on expenses        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on expense_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on splits          for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on settlements     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on wishlist        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── STAR SCHEMA VIEW (used by DuckDB in Phase 3) ─────────────

create or replace view fact_expenses as
  select
    ee.id,
    ee.user_id,
    e.id                                           as expense_group_id,
    e.name                                         as expense_name,
    e.category,
    e.month,
    ee.date,
    ee.amount,
    ee.note,
    ee.paid_by,
    extract(year    from ee.date::date)::integer   as year,
    extract(month   from ee.date::date)::integer   as month_num,
    extract(quarter from ee.date::date)::integer   as quarter,
    extract(day     from ee.date::date)::integer   as day_of_month,
    extract(dow     from ee.date::date) in (0,6)   as is_weekend
  from expense_entries ee
  join expenses e on ee.expense_id = e.id;
