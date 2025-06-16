# Production Database Migration Guide (for Dummies)

## Goal
Never break production with a schema change. Always use migrations. No surprises.

---

## 1. Make Your Entity Changes Locally
Edit your `.entity.ts` files as needed.
- Local dev uses `synchronize: true` so you don't care about migrations here.
- **IMPORTANT**: If you want to generate a migration, you need to either:
  - Comment out `synchronize: true` in your dev config, or
  - Make sure your changes are not already synced to your local DB

---

## 2. Generate a Migration (Inside the Container)

**a. Make sure your local Postgres is running:**
```bash
docker-compose up -d
```

**b. Generate the migration (from inside the API container):**
```bash
docker exec -it project-management-api-api-1 sh -c "pnpm run migration:generate src/migrations/YourMigrationName"
```
- This uses your local DB to figure out what's changed.
- It creates a file in `src/migrations/`.
- If you get "No changes in database schema were found", it means your local DB is already in sync with your entities.

---

## 3. Review the Migration File
Open the new file in `src/migrations/`.
- Make sure it only does what you expect (add/drop columns, tables, etc).
- Check both `up()` and `down()` methods.

---

## 4. Build Your Project
```bash
pnpm run build
```
- This compiles your migration to `dist/migrations/`.
- Also compiles your TypeORM config to `dist/config/`.

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
- The migration runs using the compiled JS files from `dist/`.

---

## 7. If the Migration Fails on Fly Deploy
- The deploy will abort.
- Your prod DB is safe.
- Common issues:
  - Missing TypeScript dependencies in production (need `ts-node` and `typescript` in `dependencies`, not `devDependencies`)
  - Wrong path to TypeORM config (should use `dist/config/typeorm.config.js` in production)
  - Migration already applied
- Fix the issue locally, repeat steps 2–6.

---

## 8. Never Use `synchronize: true` in Production
- Only use it in dev.
- In prod, all schema changes must go through migrations.
- Your `package.json` should have different migration commands for dev and prod:
  ```json
  "scripts": {
    "migration:generate": "npm run typeorm -- migration:generate -d src/config/typeorm.config.ts",
    "migration:run": "npm run typeorm -- migration:run -d dist/config/typeorm.config.js"
  }
  ```

---

## TL;DR
1. Change entities.
2. `docker exec -it project-management-api-api-1 sh -c "pnpm run migration:generate src/migrations/Whatever"`
3. Check the file.
4. `pnpm run build`
5. Commit & push.
6. `fly deploy`
7. If deploy fails, fix migration and repeat.

---

**No more surprises in production.** 