# Database Starter

`schema.sql` provides a baseline relational schema for cloud persistence.

It supports:
- Time-stamped readings
- Threshold/abnormal alerts
- Appliance metadata

Use this as a starting point for PostgreSQL/Supabase/other SQL-backed cloud DB.

## Backup and Restore

Create a manual SQL backup with:

```bash
bash ./scripts/backup_database.sh
```

Backups are written to `archive/database_backups/` by default, which is already git-ignored.

Restore a backup into a new database with:

```bash
psql "$DATABASE_URL" < archive/database_backups/<your-backup-file>.sql
```
