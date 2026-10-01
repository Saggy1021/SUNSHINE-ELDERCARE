# BACKUP & RECOVERY RUNBOOK

## Recovery Objectives
- **RPO (Recovery Point Objective):** < 10 Minutes (Subject to Supabase PITR guarantees).
- **RTO (Recovery Time Objective):** < 4 Hours (Subject to team availability).

## Database Recovery
1. **Verification:** Ensure Supabase Point-in-Time Recovery (PITR) is actively enabled.
2. **Restore Drills:** Never overwrite the live production instance. Restore the PITR backup into a secondary shadow project.
3. **Data Preservation:** Export critical `Invoice` and `Payment` tables before performing destructive merges to prevent financial audit discrepancies.

## Migration Recovery
- **Forward-Only Strategy:** If a migration corrupts data structures, write a new Prisma migration correcting the structure. Never execute `prisma migrate reset` in production.

## R2 Durability
- Documents stored in Cloudflare R2 are inherently multi-regional. Object deletion is considered permanent unless explicit versioning bounds are manually enabled via Cloudflare dashboard limits.
