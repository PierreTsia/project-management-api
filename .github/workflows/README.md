# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated deployment and testing.

## Fly.io Preview Deployments

The `fly-preview.yml` workflow provides automatic preview deployments for pull requests.

### Features

- ✅ **Automatic PR Deployments**: Creates preview apps for each PR
- ✅ **Production Deployments**: Deploys to production on main branch pushes
- ✅ **Automatic Cleanup**: Removes preview apps when PRs are closed
- ✅ **PR Comments**: Posts preview URLs as comments on PRs
- ✅ **Test Integration**: Runs tests before deployment

### Required Secrets

You need to set up these secrets in your GitHub repository:

1. **FLY_API_TOKEN**: Your Fly.io API token
   ```bash
   # Generate a Fly.io API token
   flyctl auth token
   ```

2. **GITHUB_TOKEN**: Automatically provided by GitHub Actions

### Setup Instructions

1. **Generate Fly.io API Token**:
   ```bash
   flyctl auth token
   ```

2. **Add Secret to GitHub**:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `FLY_API_TOKEN`
   - Value: Your Fly.io API token

3. **Update Organization** (if needed):
   - Edit `.github/workflows/fly-preview.yml`
   - Change `--org personal` to your Fly.io organization name

### How It Works

1. **On PR Open/Update**: 
   - Creates a preview app named `project-management-api-pr-{PR_NUMBER}`
   - Deploys your code to the preview app
   - Comments the preview URL on the PR

2. **On PR Close**:
   - Automatically destroys the preview app
   - Cleans up resources

3. **On Main Push**:
   - Deploys to your production app

### Preview URLs

Preview apps will be available at:
```
https://project-management-api-pr-{PR_NUMBER}.fly.dev
```

### Troubleshooting

- **App Creation Fails**: Check your Fly.io organization name and permissions
- **Deploy Fails**: Check your `fly.toml` configuration
- **Cleanup Fails**: Preview apps can be manually destroyed via Fly.io dashboard

### Cost Considerations

- Preview apps are separate Fly.io apps and may incur costs
- Apps are automatically cleaned up when PRs are closed
- Consider setting up Fly.io billing alerts 