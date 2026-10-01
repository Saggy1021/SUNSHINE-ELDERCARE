# DATABASE OPERATIONS

## Architecture
- **Provider:** Supabase PostgreSQL
- **ORM:** Prisma
- **Pooling:** Vercel serverless connections necessitate a connection pooler (PgBouncer/Supavisor) configured via the `DATABASE_URL`.

## Migration Rules
1. Never manipulate production schema via `migrate dev`, `db push`, or manual SQL.
2. `npx prisma migrate deploy` is the only approved command for altering production schema.
3. Migrations must utilize `DIRECT_URL` to bypass connection poolers which do not support schema migrations.

## Historical Migration Context
- **Phase 17.7 Migration:** An empty harmless migration exists in the tracking table due to a development baseline drift. It requires no action.
- **Phase 19G Migration (PENDING):** The `phase19g_storage_tracking` migration has not been physically generated yet because an isolated local PostgreSQL container is required to run `prisma migrate dev` safely. This must be resolved prior to launch.

## Backups & PITR
Supabase Point-in-Time Recovery (PITR) must be actively verified. Restores must target alternative shadow databases, never forcibly overwriting production without an explicit declared incident response procedure.
