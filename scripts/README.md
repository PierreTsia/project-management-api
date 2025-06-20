# PR Preview Database Management Scripts

These scripts help manage the **PR preview database** used specifically for Fly.io review apps. This is **NOT** the main production database.

## ⚠️ Important Note

This database is **only for PR previews** and is separate from your main application database. It's used by the GitHub Actions workflow to deploy preview environments for pull requests.

## 🚀 Scripts

### `start-preview-db.sh` / `npm run preview-db:start`
Starts the PR preview database with intelligent recovery for common issues:

- **Handles leader election failures** (common with unmanaged Postgres)
- **Falls back to machine restart** when standard restart fails
- **Waits for health checks** to confirm database is ready
- **Provides troubleshooting tips** if startup fails

```bash
./scripts/start-preview-db.sh
# or
npm run preview-db:start
```

### `stop-preview-db.sh` / `npm run preview-db:stop`
Stops the PR preview database to save resources:

- **Checks current state** before attempting to stop
- **Uses machine-level stop** for unmanaged Postgres
- **Provides dashboard link** if manual intervention needed

```bash
./scripts/stop-preview-db.sh
# or
npm run preview-db:stop
```

### `preview-db-status.sh` / `npm run preview-db:status`
Provides detailed status and health information:

- **Shows individual health checks** (pg, vm, role)
- **Identifies specific issues** (leader election, app status)
- **Provides troubleshooting commands** for common problems
- **Links to Fly.io dashboard** for manual intervention

```bash
./scripts/preview-db-status.sh
# or
npm run preview-db:status
```

## 🛠️ Usage

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

## 🔧 Troubleshooting

### Common Issues

#### "no active leader found"
This is the most common issue with unmanaged Fly Postgres. The scripts now handle this automatically:

```bash
# The start script will automatically try:
# 1. Standard restart (usually fails)
# 2. Machine restart (usually works)
npm run preview-db:start
```

#### Database won't start
If the scripts can't start the database:

1. Check the status: `npm run preview-db:status`
2. Check logs: `fly logs -a red-cloud-4808`
3. Check Fly.io dashboard: https://fly.io/apps/red-cloud-4808
4. Try manual restart: `fly machines restart <machine-id> -a red-cloud-4808`

#### Health checks failing
The status script will show which specific checks are failing:
- **pg**: Database connectivity issues
- **vm**: Machine resource issues  
- **role**: Leader election issues (most common)

## 📊 PR Preview Database Details

- **App Name**: `red-cloud-4808`
- **Region**: `cdg` (Paris)
- **Type**: PostgreSQL 17.2 (Unmanaged)
- **Purpose**: **PR preview deployments only** (not production)
- **Used by**: GitHub Actions workflow for review apps

## 🎯 When to Use

- ✅ **Creating a PR** - Start the database so your PR preview works
- ✅ **Testing PR previews** - Check status if preview isn't working
- ✅ **After merging** - Stop to save resources
- ✅ **Troubleshooting** - Use status script to diagnose issues
- ❌ **Production deployments** - This is NOT your main database
- ❌ **Local development** - Use your local database instead

## 🔗 Main Database vs PR Preview Database

| Aspect | Main Database | PR Preview Database |
|--------|---------------|-------------------|
| **Purpose** | Production app | PR previews only |
| **Location** | Your main Fly.io app | Separate Fly.io app |
| **Management** | Production deployment | These scripts |
| **Data** | Real user data | Test data only |
| **Uptime** | Always running | Started when needed |
| **Issues** | Production support | Self-service via scripts | 