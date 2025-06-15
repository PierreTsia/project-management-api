# Deploying Project Management API on Fly.io

This guide will walk you through deploying your NestJS application and PostgreSQL database on Fly.io.

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

## Step 2: Set Up Managed PostgreSQL

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
fly postgres attach <your-database-name>
```

## Step 3: Configure Your Application

1. Create a `fly.toml` file in your project root:
```toml
app = "your-app-name"
primary_region = "your-region"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 1024
```

2. Update your environment variables:
```bash
fly secrets set DATABASE_URL="postgres://username:password@host:port/database"
```

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

## Step 5: Scale Your Application (Optional)

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

## Cost Optimization

1. Use auto-stop for development environments
2. Monitor resource usage
3. Scale down when not in use
4. Use shared-cpu for non-critical workloads

## Additional Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Fly.io Status Page](https://status.fly.io/)
- [Fly.io Community](https://community.fly.io/)