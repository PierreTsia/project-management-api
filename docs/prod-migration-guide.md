# Production Database Migration Guide (for Dummies)

## Goal
Never break production with a schema change. Always use migrations. No surprises.

---

## 1. Make Your Entity Changes Locally
Edit your `.entity.ts` files as needed.
- Local dev uses `synchronize: true` so you don't care about migrations here.

---

## 2. Generate a Migration (Locally, Against Your Local DB)

**a. Make sure your local Postgres is running:**
```bash
docker-compose up -d
```

**b. Generate the migration:**
```bash
pnpm run migration:generate src/migrations/YourMigrationName
```
- This uses your local DB to figure out what's changed.
- It creates a file in `src/migrations/`.

---

## 3. Review the Migration File
Open the new file in `src/migrations/`.
- Make sure it only does what you expect (add/drop columns, tables, etc).

---

## 4. Build Your Project
```bash
pnpm run build
```
- This compiles your migration to `dist/migrations/`.

---

## 5. Commit and Push
```bash
git add src/migrations/ dist/migrations/
git commit -m "Add migration for X"
git push
```

---

## 6. Deploy to Fly.io
```bash
fly deploy
```
- Fly will **automatically run the migration** before starting the new app version (thanks to `release_command` in `fly.toml`).

---

## 7. If the Migration Fails on Fly Deploy
- The deploy will abort.
- Your prod DB is safe.
- Fix the migration locally, repeat steps 2–6.

---

## 8. Never Use `synchronize: true` in Production
- Only use it in dev.
- In prod, all schema changes must go through migrations.

---

## TL;DR
1. Change entities.
2. `pnpm run migration:generate src/migrations/Whatever`
3. Check the file.
4. `pnpm run build`
5. Commit & push.
6. `fly deploy`
7. If deploy fails, fix migration and repeat.

---

**No more surprises in production.** 