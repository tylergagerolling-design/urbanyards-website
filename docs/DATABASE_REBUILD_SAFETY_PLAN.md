# Database Rebuild Safety Plan

This is a mandatory guardrail for the Urban Yards dashboard rebuild.

## Non-Destructive Rule

Do not reset, clear, recreate, or destructively simplify the existing Supabase database at the beginning of the rebuild.

Do not delete existing tables, records, functions, triggers, storage references, authentication relationships, or Row Level Security policies without first auditing and documenting them.

## Required Before Any Schema Change

1. Run `supabase/DATABASE_INVENTORY_READONLY.sql`.
2. Export or save the inventory results.
3. Identify which tables and policies are actively used by the current application.
4. Separate records into likely production data, imported business data, development data, and disposable test data.
5. Create a Supabase backup, Supabase branch, or verified recovery point.
6. Write a migration plan showing what will be retained, modified, migrated, deprecated, archived, or eventually removed.

## Staged Migration Rule

When an existing table needs major restructuring:

1. Add the replacement structure.
2. Migrate and transform existing records.
3. Verify record totals, required fields, relationships, and ownership.
4. Update the application to use the replacement structure.
5. Keep the former structure temporarily as read-only or archived.
6. Remove old structures only in a later migration after the new app is tested.

Never drop a table merely because its current structure is inconvenient.

## RLS and Auth Rules

- Do not reset Supabase Auth unless the existing system is proven unusable.
- Do not weaken or globally disable Row Level Security during migration.
- Use development databases, Supabase branches, or isolated local environments for destructive testing.
- Do not run destructive reset commands against production.

## Completion Report Requirements

At the end of a database-affecting rebuild phase, provide:

- Original database inventory.
- Tables and policies retained.
- Migrations applied.
- Data migrated.
- Record-count verification.
- Deprecated structures still present.
- Structures recommended for later removal.
- Backup and rollback instructions.

## Current Phase

The initial rebuild foundation does not apply schema changes. It adds code-level architecture modules and a read-only inventory script only.
