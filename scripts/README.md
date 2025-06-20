# PR Preview Database Management Scripts

These scripts help manage the **PR preview database** used specifically for Fly.io review apps. This is **NOT** the main production database.

## ⚠️ Important Note

This database is **only for PR previews** and is separate from your main application database. It's used by the GitHub Actions workflow to deploy preview environments for pull requests.

## Scripts

### `start-preview-db.sh` / `npm run preview-db:start`
Starts the PR preview database if it's stopped. Includes health checks and waiting for the database to be ready.

```bash
./scripts/start-preview-db.sh
# or
npm run preview-db:start
```

### `stop-preview-db.sh` / `npm run preview-db:stop`
Stops the PR preview database to save resources.

```bash
./scripts/stop-preview-db.sh
# or
npm run preview-db:stop
```

### `preview-db-status.sh` / `npm run preview-db:status`
Shows the current status of the PR preview database.

```bash
./scripts/preview-db-status.sh
# or
npm run preview-db:status
```

## Usage

### Before creating a PR
If you want to ensure the PR preview database is running for your PR preview:

```bash
npm run preview-db:start
```

### After merging a PR
To save resources, you can stop the PR preview database:

```bash
npm run preview-db:stop
```

### Check PR preview database health
To see if the PR preview database is running and healthy:

```bash
npm run preview-db:status
```

## PR Preview Database Details

- **App Name**: `red-cloud-4808`
- **Region**: `cdg` (Paris)
- **Type**: PostgreSQL 17.2
- **Purpose**: **PR preview deployments only** (not production)
- **Used by**: GitHub Actions workflow for review apps

## When to Use

- ✅ **Creating a PR** - Start the database so your PR preview works
- ✅ **Testing PR previews** - Check status if preview isn't working
- ✅ **After merging** - Stop to save resources
- ❌ **Production deployments** - This is NOT your main database
- ❌ **Local development** - Use your local database instead

## Troubleshooting

If the PR preview database won't start or has health check issues:

1. Check the status: `npm run preview-db:status`
2. Try restarting: `npm run preview-db:start`
3. Check Fly.io dashboard: https://fly.io/apps/red-cloud-4808
4. Check logs: `fly logs -a red-cloud-4808`

## Main Database vs PR Preview Database

| Aspect | Main Database | PR Preview Database |
|--------|---------------|-------------------|
| **Purpose** | Production app | PR previews only |
| **Location** | Your main Fly.io app | Separate Fly.io app |
| **Management** | Production deployment | These scripts |
| **Data** | Real user data | Test data only |
| **Uptime** | Always running | Started when needed 