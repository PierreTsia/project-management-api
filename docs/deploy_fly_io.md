# Deploying Project Management API on Fly.io

This guide covers deploying your NestJS application with PostgreSQL database on Fly.io, including automatic migrations.

## Prerequisites

1. Install Fly.io CLI:
```bash
# For macOS
brew install flyctl
```

2. Sign up and login to Fly.io:
```bash
fly auth signup  # If you haven't signed up
fly auth login   # If you already have an account
```

## Environment Variables Management

### Local Development
- Use `.env` file for local development (gitignored)
- Use `.env.production` for production values (gitignored)
- Never commit sensitive data to git

### Production Environment
1. Create a `.env.production` file locally (gitignored) with your production values:
```bash
# Database
DATABASE_URL=postgres://username:password@host:port/database

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Application
PROJECT_NAME=your_project_name
NODE_ENV=production
# Add other environment variables as needed
```

2. Set secrets in Fly.io:
```bash
# Set all secrets at once from .env.production
fly secrets import .env.production

# Or set them individually
fly secrets set CLOUDINARY_CLOUD_NAME="your_cloud_name"
fly secrets set CLOUDINARY_API_KEY="your_api_key"
fly secrets set CLOUDINARY_API_SECRET="your_api_secret"
fly secrets set PROJECT_NAME="your_project_name"
```

3. Verify secrets:
```bash
fly secrets list
```

4. Update secrets:
```bash
# Update individual secret
fly secrets set KEY="new_value"

# Update multiple secrets
fly secrets import .env.production
```

5. Remove secrets:
```bash
fly secrets unset KEY
```

### Best Practices
1. Never commit sensitive data to git
2. Use different values for development and production
3. Regularly rotate sensitive credentials
4. Use strong, unique passwords
5. Keep your `.env.production` file secure and backed up
6. Document all required environment variables in README.md

## Step 1: Create a Fly.io Application

1. Initialize your application:
```bash
fly launch
```

2. When prompted:
   - Choose a unique app name
   - Select your preferred region
   - Choose "No" for PostgreSQL (we'll set it up separately)
   - Choose "No" for Redis (if not needed)

## Step 2: Set Up PostgreSQL Database

### Option A: Fly.io Managed PostgreSQL (Recommended)
1. Create a new PostgreSQL database:
```bash
fly postgres create
```

2. When prompted:
   - Choose a unique database name
   - Select the same region as your app
   - Choose the "Basic" plan (free tier)

3. Attach the database to your app:
```bash
fly postgres attach <your-database-name> --app <your-app-name>
```

### Option B: Unmanaged Fly Postgres (Current Setup)
1. Create a new PostgreSQL cluster:
```bash
fly postgres create
```

2. Attach to your app:
```bash
fly postgres attach <your-database-name> --app <your-app-name>
```

**Note:** Unmanaged Postgres uses internal `.flycast` DNS and is not accessible from external services like GitHub Actions.

## Step 3: Configure Your Application

Your `fly.toml` should look like this:
```toml
app = "your-app-name"
primary_region = "cdg"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[vm]]
  memory = '1gb'
  cpu_kind = 'shared'
  cpus = 1

# Automatically run DB migrations before each deploy
[deploy]
  release_command = "pnpm run migrate:prod"
```

**Key points:**
- `release_command = "pnpm run migrate:prod"` runs migrations before each deployment
- If migrations fail, deployment aborts and old app keeps running
- This ensures database schema is always up to date

## Step 4: Deploy Your Application

1. Deploy your application:
```bash
fly deploy
```

2. Monitor the deployment:
```bash
fly status
```

3. View logs:
```bash
fly logs
```

**What happens during deployment:**
1. Fly.io builds your Docker image
2. **Before starting the new version**, Fly runs the release command
3. The release command runs: `pnpm run migrate:prod`
4. If migrations succeed → new app starts
5. If migrations fail → deployment aborts, old app keeps running

## Step 5: Database Migrations

### Automatic Migrations (Recommended)
Migrations run automatically during deployment via the `release_command` in `fly.toml`.

### Manual Migrations (if needed)
```bash
# SSH into your app and run migrations manually
fly ssh console -s your-app-name
pnpm run migrate:prod
```

### Migration Troubleshooting
If migrations fail during deployment:
1. Check logs: `fly logs`
2. Common issues:
   - Missing dependencies (ensure `dotenv` is in `dependencies`)
   - Wrong file paths (migration script uses `dist/scripts/migrate.js`)
   - SSL configuration (handled automatically for production databases)

## Step 6: Scale Your Application (Optional)

1. Scale your application:
```bash
fly scale count 1
```

2. Scale memory:
```bash
fly scale memory 1024
```

## Useful Commands

- View app status: `fly status`
- View logs: `fly logs`
- SSH into app: `fly ssh console`
- Open app: `fly open`
- List apps: `fly apps list`
- Destroy app: `fly apps destroy`

## Troubleshooting

1. If deployment fails:
   - Check logs: `fly logs`
   - Verify environment variables: `fly secrets list`
   - Ensure database is running: `fly postgres status`

2. Common issues:
   - Database connection issues: Verify DATABASE_URL
   - Migration failures: Check migration logs in deployment
   - Memory issues: Scale up memory
   - Port conflicts: Check internal_port in fly.toml

## Free Tier Limitations

- 3 shared-cpu VMs
- 3GB persistent volume storage
- 160GB outbound data transfer
- 3GB RAM per VM
- 1GB storage for PostgreSQL

## Monitoring

1. View metrics:
```bash
fly metrics
```

2. Set up alerts:
```bash
fly alerts create
```

## Backup and Restore

1. Backup database:
```bash
fly postgres backup create
```

2. List backups:
```bash
fly postgres backup list
```

3. Restore from backup:
```bash
fly postgres backup restore <backup-id>
```

## Security Considerations

1. Always use HTTPS (enabled by default)
2. Keep your secrets secure using `fly secrets`
3. Regularly update dependencies
4. Monitor your application logs
5. Use the latest PostgreSQL version
6. Database is not publicly accessible (uses internal Fly.io network)

## Cost Optimization

1. Use auto-stop for development environments
2. Monitor resource usage
3. Scale down when not in use
4. Use shared-cpu for non-critical workloads

## Additional Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Fly.io Status Page](https://status.fly.io/)
- [Fly.io Community](https://community.fly.io/)
- [Database Migration Guide](./prod-migration-guide.md)