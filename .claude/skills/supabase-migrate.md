---
name: supabase-migrate
description: Create and run Supabase database migrations for new tables, columns, indexes, or RLS policies
user_invocable: true
---

# Supabase Migration

Create a migration for: $ARGUMENTS

## Process

1. Generate a timestamped SQL file at `/supabase/migrations/[YYYYMMDDHHMMSS]_[description].sql`

2. Follow these conventions:
   - UUID primary keys with `gen_random_uuid()`
   - `created_at TIMESTAMPTZ DEFAULT NOW()` and `updated_at TIMESTAMPTZ DEFAULT NOW()` on all tables
   - `TEXT[]` for array fields (traditions, topics, etc.)
   - `JSONB` for flexible/nested data
   - GIN indexes on array columns, BTREE on lookup columns
   - RLS enabled: public SELECT for content tables, authenticated INSERT/UPDATE for admin

3. Reference `/docs/UNRAVELED-Technical-Architecture-v10.md` for the full schema design

4. Show the SQL and explain what it does before running

5. Run against the linked Supabase project:
   ```
   npx supabase db query --linked -f supabase/migrations/[filename].sql
   ```

6. Verify the migration applied: query the table or check `information_schema.tables`
