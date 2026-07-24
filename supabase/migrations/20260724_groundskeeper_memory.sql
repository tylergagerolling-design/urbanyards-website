create extension if not exists pgcrypto;

create table if not exists public.assistant_memories (
  id uuid primary key default gen_random_uuid(),
  memory_type text not null check (memory_type in ('conversation', 'record', 'business_rule', 'user_preference', 'outcome')),
  statement text not null check (char_length(statement) between 1 and 2000),
  scope jsonb not null default '{}'::jsonb,
  source text not null check (source in ('user_correction', 'approved_rule', 'record', 'outcome')),
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  approved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  last_used_at timestamptz,
  is_active boolean not null default true
);

create index if not exists assistant_memories_active_type_idx on public.assistant_memories (is_active, memory_type);
create index if not exists assistant_memories_scope_gin_idx on public.assistant_memories using gin (scope);
create index if not exists assistant_memories_expires_idx on public.assistant_memories (expires_at) where expires_at is not null;

create table if not exists public.assistant_outcomes (
  id uuid primary key default gen_random_uuid(),
  recommendation_id text not null,
  recommendation_type text not null,
  accepted boolean not null default false,
  completed boolean not null default false,
  result text,
  financial_impact numeric(12,2),
  time_saved_minutes integer check (time_saved_minutes is null or time_saved_minutes >= 0),
  user_rating integer check (user_rating is null or user_rating between 1 and 5),
  user_correction text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assistant_outcomes_recommendation_idx on public.assistant_outcomes (recommendation_id, created_at desc);

alter table public.assistant_memories enable row level security;
alter table public.assistant_outcomes enable row level security;

revoke all on public.assistant_memories from anon, authenticated;
revoke all on public.assistant_outcomes from anon, authenticated;
