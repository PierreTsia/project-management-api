# Project Management API

[![codecov](https://codecov.io/gh/PierreTsia/project-management-api/branch/main/graph/badge.svg)](https://codecov.io/gh/PierreTsia/project-management-api)

A comprehensive REST API for project management with team collaboration features, built with NestJS and TypeScript. This API provides a complete solution for managing projects, tasks, team members, and user authentication.

## 🚀 Features

### Core Functionality
- **📋 Project Management**: Create, update, archive, and manage projects with detailed contributor roles
- **✅ Task Management**: Full task lifecycle with status tracking, assignments, and priority management
- **👥 Team Collaboration**: Role-based access control with READ, WRITE, DELETE, and ADMIN permissions
- **🔐 Authentication**: JWT-based authentication with refresh tokens and Google OAuth integration
- **👤 User Management**: User profiles, email confirmation, and password reset functionality
- **📧 Email Notifications**: Automated email sending for confirmations and password resets
- **🌐 Internationalization**: Multi-language support (English/French) with i18n
- **📁 File Uploads**: Cloudinary integration for avatar and file management
- **🧪 Comprehensive Testing**: Unit and e2e tests with high coverage

### Advanced Features
- **🔒 Role-Based Permissions**: Granular project and task-level permissions
- **📊 Task Workflow**: Status transitions with validation (TODO → IN_PROGRESS → DONE)
- **🎯 Task Assignment**: Dedicated endpoints for task assignment and status updates
- **📈 Project Activity**: Contributor management and project lifecycle tracking
- **🔄 Database Migrations**: Safe schema evolution with TypeORM migrations
- **🚀 CI/CD**: Automated deployments with Fly.io and GitHub Actions

## 🛠 Tech Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT + Passport.js + Google OAuth
- **File Storage**: Cloudinary
- **Email**: Nodemailer with Handlebars templates
- **Validation**: Class-validator with i18n support
- **Testing**: Jest with supertest
- **Deployment**: Fly.io with Docker
- **Package Manager**: PNPM
- **CI/CD**: GitHub Actions

## 📚 Documentation

- **[API Documentation](./docs/18_projects_tasks_epic.md)**: Detailed feature specifications and domain model
- **[Deployment Guide](./docs/deploy_fly_io.md)**: Complete Fly.io deployment instructions
- **[Database Migration Guide](./docs/prod-migration-guide.md)**: Safe schema evolution practices
- **[PR Preview Database](./scripts/README.md)**: Managing preview environments

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x
- PNPM 8.x
- PostgreSQL
- Docker and Docker Compose (for containerized development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd project-management-api

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Development

#### Local Development

```bash
# Start development server
pnpm start:dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Lint code
pnpm lint

# Type checking
pnpm typecheck
```

#### Docker Development

```bash
# Start development environment with Docker
pnpm start:dev:docker
```

This will:
- Build and start all required services (API, PostgreSQL, etc.)
- Set up the development environment automatically
- Watch for changes and rebuild as needed

### Database Management

```bash
# Generate a new migration
docker-compose exec api pnpm run migration:generate src/migrations/YourMigrationName

# Run migrations locally
docker-compose exec api pnpm run migrate:prod

# Revert last migration
docker-compose exec api pnpm run migration:revert
```

### PR Preview Database

For managing the PR preview database used by GitHub Actions:

```bash
# Start PR preview database
pnpm run preview-db:start

# Stop PR preview database
pnpm run preview-db:stop

# Check PR preview database status
pnpm run preview-db:status
```

## 📖 API Documentation

When running the server, comprehensive API documentation is available at:
- **Swagger UI**: `http://localhost:3000/api/docs`
- **API Base URL**: `http://localhost:3000/api/v1`

### Key Endpoints

#### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/forgot-password` - Password reset request
- `GET /auth/google` - Google OAuth login

#### Projects
- `GET /projects` - List user's projects
- `POST /projects` - Create new project
- `GET /projects/:id` - Get project details
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project
- `PUT /projects/:id/archive` - Archive project
- `PUT /projects/:id/activate` - Activate archived project
- `GET /projects/:id/contributors` - List project contributors
- `POST /projects/:id/contributors` - Add contributor

#### Tasks
- `GET /projects/:projectId/tasks` - List project tasks
- `POST /projects/:projectId/tasks` - Create new task
- `GET /projects/:projectId/tasks/:taskId` - Get task details
- `PUT /projects/:projectId/tasks/:taskId` - Update task
- `DELETE /projects/:projectId/tasks/:taskId` - Delete task
- `PUT /projects/:projectId/tasks/:taskId/status` - Update task status (assignee only)
- `PUT /projects/:projectId/tasks/:taskId/assign` - Assign task to user

#### Users
- `GET /users/whoami` - Get current user profile
- `POST /users/avatar` - Upload user avatar

## 🧪 Testing

```bash
# Unit tests
pnpm test

# e2e tests
pnpm test:e2e

# Test coverage
pnpm test:cov

# Watch mode
pnpm test:watch
```

## 🚀 Deployment

### Production Deployment

The application is configured for deployment on Fly.io with automatic migrations:

```bash
# Deploy to production
fly deploy
```

### Environment Variables

Required environment variables for production:

```bash
# Database
DATABASE_URL=postgres://username:password@host:port/database

# Authentication
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Application
NODE_ENV=production
PORT=3000
CORS_ORIGIN=your_frontend_url
```

## 📁 Project Structure

```
src/
├── auth/           # Authentication & authorization
├── users/          # User management
├── projects/       # Project management
├── tasks/          # Task management
├── email/          # Email services
├── cloudinary/     # File upload services
├── common/         # Shared services & filters
├── config/         # Configuration files
├── migrations/     # Database migrations
└── scripts/        # Utility scripts
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **[API Documentation](./docs/18_projects_tasks_epic.md)**: Detailed feature specifications
- **[Deployment Guide](./docs/deploy_fly_io.md)**: Fly.io deployment instructions
- **[Migration Guide](./docs/prod-migration-guide.md)**: Database migration practices
- **[PR Preview Database](./scripts/README.md)**: Preview environment management
