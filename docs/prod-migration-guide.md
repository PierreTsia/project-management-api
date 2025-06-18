# Database Schema Changes: Step-by-Step Guide

## Overview
Since `synchronize: false` is always used (both locally and in production), **ALL** schema changes must go through migrations. This ensures consistency and prevents data loss.

---

## When You Change the Database Schema

### Step 1: Make Your Entity Changes Locally
1. Edit your `.entity.ts` files as needed
2. **DO NOT** change `synchronize` to `true` - keep it `false`

### Step 2: Generate a Migration
```bash
# Make sure your local DB is running
docker-compose up -d

# Generate migration from inside the container
docker-compose exec api pnpm run migration:generate src/migrations/YourMigrationName
```

**What this does:**
- Compares your current entities with the actual database schema
- Creates a new file in `src/migrations/` with the differences
- If you get "No changes in database schema were found", your local DB is already in sync

### Step 3: Review the Generated Migration
1. Open the new file in `src/migrations/`
2. Check both `up()` and `down()` methods
3. Make sure it only does what you expect (add/drop columns, tables, etc.)
4. **If the migration looks wrong, delete it and fix your entities first**

### Step 4: Test the Migration Locally
```bash
# Build the project (compiles migration to dist/)
pnpm build

# Run the migration locally
docker-compose exec api pnpm run migrate:prod
```

**Expected result:** "Running migrations... Migrations completed successfully"

### Step 5: Commit and Push
```bash
git add src/migrations/ dist/migrations/
git commit -m "Add migration for [describe your changes]"
git push
```

### Step 6: Deploy to Production
```bash
fly deploy
```

**What happens during deployment:**
1. Fly.io builds your app
2. **Before starting the new version**, Fly runs: `pnpm run migrate:prod`
3. If migration succeeds → new app starts
4. If migration fails → deployment aborts, old app keeps running

---

## If Something Goes Wrong

### Migration Fails Locally
- Check your entity changes
- Verify the migration file makes sense
- Delete the migration file and regenerate if needed

### Migration Fails in Production
- **Your production database is safe** (deployment aborts)
- Check Fly.io logs: `fly logs`
- Fix the issue locally, then repeat steps 2-6

### Common Issues
1. **Missing dependencies**: Make sure `dotenv` is in `dependencies` (not `devDependencies`)
2. **Wrong paths**: Migration script uses `dist/scripts/migrate.js` in production
3. **Already applied**: Migration was already run on the database
4. **SSL issues**: Migration script automatically handles SSL for production databases

---

## Migration Commands Reference

```bash
# Generate migration
docker-compose exec api pnpm run migration:generate src/migrations/YourMigrationName

# Run migrations locally
docker-compose exec api pnpm run migrate:prod

# Run migrations in production (happens automatically during fly deploy)
pnpm run migrate:prod

# Revert last migration (if needed)
docker-compose exec api pnpm run migration:revert
```

---

## File Locations
- **Migration source**: `src/migrations/`
- **Compiled migrations**: `dist/migrations/`
- **Migration script**: `src/scripts/migrate.ts` → `dist/scripts/migrate.js`
- **TypeORM config**: `src/config/typeorm.config.ts` → `dist/config/typeorm.config.js`

---

## Best Practices
1. **Always test migrations locally first**
2. **Never use `synchronize: true`** (you already have this right!)
3. **One migration per change** - don't bundle multiple schema changes
4. **Review generated migrations** before committing
5. **Use descriptive migration names** (e.g., `AddUserProfileTable`, `AddEmailVerifiedColumn`)

---

## TL;DR
1. Change entities
2. `docker-compose exec api pnpm run migration:generate src/migrations/Whatever`
3. Review the file
4. `pnpm build`
5. `docker-compose exec api pnpm run migrate:prod` (test locally)
6. Commit & push
7. `fly deploy` (runs migration automatically)

**Result: Safe, predictable schema changes in production.** 🎯 